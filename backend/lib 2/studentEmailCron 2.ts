import type { Firestore } from "firebase-admin/firestore";
import {
  alreadySentDueReminder,
  buildDueReminderEmail,
  buildInactivityNudgeEmail,
  canSendInactivityNudge,
  getLastActivityMs,
  INACTIVITY_DAYS,
  isAssignmentIncomplete,
  isInactiveForDays,
  isInDueReminderWindow,
  MS_DAY,
  studentRecipientEmail,
  type StudentProfileLike,
} from "./studentEmails.js";

export type EmailSendResult = { sent: boolean; simulated: boolean; error?: string };

export type SendEmailFn = (opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  context?: string;
}) => Promise<EmailSendResult>;

export type DueReminderRunResult = {
  scanned: number;
  eligible: number;
  sent: number;
  skipped: number;
  errors: number;
  details: { assignmentId: string; studentUid: string; reason: string }[];
};

export type InactivityNudgeRunResult = {
  scanned: number;
  eligible: number;
  sent: number;
  skipped: number;
  errors: number;
  details: { studentUid: string; reason: string }[];
};

function firstName(name: string | undefined): string {
  return (name || "there").split(" ")[0];
}

export async function runDueDateReminders(
  db: Firestore,
  sendEmail: SendEmailFn,
  appBaseUrl: string,
  now = new Date()
): Promise<DueReminderRunResult> {
  const result: DueReminderRunResult = {
    scanned: 0,
    eligible: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const assignSnap = await db
    .collection("assignments")
    .where("dueAt", ">=", windowStart.toISOString())
    .where("dueAt", "<=", windowEnd.toISOString())
    .get();

  for (const assignDoc of assignSnap.docs) {
    const assign = assignDoc.data();
    const assignmentId = assignDoc.id;
    const dueAt = new Date(assign.dueAt);
    if (!isInDueReminderWindow(dueAt, now)) continue;

    result.scanned++;

    const classroomId = assign.classroomId as string | undefined;
    if (!classroomId) {
      result.skipped++;
      result.details.push({ assignmentId, studentUid: "", reason: "no_classroom" });
      continue;
    }

    const classSnap = await db.collection("classrooms").doc(classroomId).get();
    const studentUids: string[] = classSnap.exists ? (classSnap.data()?.studentUids || []) : [];
    const submissions = (assign.submissions || {}) as Record<string, { status?: string }>;

    for (const studentUid of studentUids) {
      const sub = submissions[studentUid];
      if (!isAssignmentIncomplete(sub)) {
        result.skipped++;
        result.details.push({ assignmentId, studentUid, reason: "completed" });
        continue;
      }

      const userSnap = await db.collection("users").doc(studentUid).get();
      if (!userSnap.exists) {
        result.skipped++;
        result.details.push({ assignmentId, studentUid, reason: "student_not_found" });
        continue;
      }

      const profile = userSnap.data() as StudentProfileLike;
      if (profile.role !== "student") {
        result.skipped++;
        result.details.push({ assignmentId, studentUid, reason: "not_student" });
        continue;
      }

      if (profile.isDemo) {
        result.skipped++;
        result.details.push({ assignmentId, studentUid, reason: "demo_account" });
        continue;
      }

      if (alreadySentDueReminder(profile.dueReminderSentFor, assignmentId)) {
        result.skipped++;
        result.details.push({ assignmentId, studentUid, reason: "already_sent" });
        continue;
      }

      const to = studentRecipientEmail(profile);
      if (!to) {
        result.skipped++;
        result.details.push({ assignmentId, studentUid, reason: "no_email" });
        continue;
      }

      result.eligible++;
      const emailContent = buildDueReminderEmail({
        firstName: firstName(profile.name),
        assignmentTitle: assign.title || "Assignment",
        dueAt,
        appBaseUrl,
      });

      const emailResult = await sendEmail({
        to,
        ...emailContent,
        context: "student-due-reminder",
      });

      if (emailResult.sent || emailResult.simulated) {
        await db.collection("users").doc(studentUid).update({
          [`dueReminderSentFor.${assignmentId}`]: now.toISOString(),
        });
        result.sent++;
      } else {
        result.errors++;
        result.details.push({
          assignmentId,
          studentUid,
          reason: emailResult.error || "send_failed",
        });
      }
    }
  }

  return result;
}

export async function runInactivityNudges(
  db: Firestore,
  sendEmail: SendEmailFn,
  appBaseUrl: string,
  now = new Date()
): Promise<InactivityNudgeRunResult> {
  const result: InactivityNudgeRunResult = {
    scanned: 0,
    eligible: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const nowMs = now.getTime();
  const studentsSnap = await db.collection("users").where("role", "==", "student").get();

  for (const studentDoc of studentsSnap.docs) {
    result.scanned++;
    const studentUid = studentDoc.id;
    const profile = studentDoc.data() as StudentProfileLike;

    if (profile.isDemo) {
      result.skipped++;
      result.details.push({ studentUid, reason: "demo_account" });
      continue;
    }

    const to = studentRecipientEmail(profile);
    if (!to) {
      result.skipped++;
      result.details.push({ studentUid, reason: "no_email" });
      continue;
    }

    if (!canSendInactivityNudge(profile.lastInactivityNudgeAt, nowMs)) {
      result.skipped++;
      result.details.push({ studentUid, reason: "nudged_this_week" });
      continue;
    }

    const [statsSnap, resultsSnap] = await Promise.all([
      db.collection("stats").doc(studentUid).get(),
      db.collection("results").doc(studentUid).get(),
    ]);

    const stats = statsSnap.exists ? statsSnap.data() : {};
    const results: { timestamp?: string }[] = resultsSnap.exists
      ? (resultsSnap.data()?.results || [])
      : [];
    const latestResultTs = results.length ? results[results.length - 1]?.timestamp : undefined;

    const lastActivityMs = getLastActivityMs([
      stats?.lastUpdated as string | undefined,
      latestResultTs,
      profile.createdAt,
    ]);

    if (!isInactiveForDays(lastActivityMs, INACTIVITY_DAYS, nowMs)) {
      result.skipped++;
      result.details.push({ studentUid, reason: "active_recently" });
      continue;
    }

    const inactiveDays = lastActivityMs
      ? Math.floor((nowMs - lastActivityMs) / MS_DAY)
      : INACTIVITY_DAYS;

    result.eligible++;
    const emailContent = buildInactivityNudgeEmail({
      firstName: firstName(profile.name),
      lastModuleTitle: profile.lastModuleTitle,
      inactiveDays,
      appBaseUrl,
    });

    const emailResult = await sendEmail({
      to,
      ...emailContent,
      context: "student-inactivity-nudge",
    });

    if (emailResult.sent || emailResult.simulated) {
      await db.collection("users").doc(studentUid).update({
        lastInactivityNudgeAt: now.toISOString(),
      });
      result.sent++;
    } else {
      result.errors++;
      result.details.push({ studentUid, reason: emailResult.error || "send_failed" });
    }
  }

  return result;
}
