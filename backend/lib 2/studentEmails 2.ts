/** Student-facing email automation helpers (due reminders + inactivity nudges). */

export const MS_HOUR = 60 * 60 * 1000;
export const MS_DAY = 24 * MS_HOUR;
export const MS_WEEK = 7 * MS_DAY;

export const DUE_REMINDER_MIN_HOURS = 24;
export const DUE_REMINDER_MAX_HOURS = 48;
export const INACTIVITY_DAYS = 7;

export type AssignmentSubmissionLike = { status?: string };
export type StudentProfileLike = {
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  isDemo?: boolean;
  lastModuleId?: string;
  lastModuleTitle?: string;
  createdAt?: string;
  dueReminderSentFor?: Record<string, string>;
  lastInactivityNudgeAt?: string;
};

export function getLastActivityMs(candidates: (string | undefined | null)[]): number | null {
  const times = candidates
    .filter(Boolean)
    .map(d => new Date(d as string).getTime())
    .filter(t => !isNaN(t));
  if (times.length === 0) return null;
  return Math.max(...times);
}

export function isInactiveForDays(lastActivityMs: number | null, days: number, nowMs: number): boolean {
  if (lastActivityMs == null) return false;
  return nowMs - lastActivityMs >= days * MS_DAY;
}

export function canSendInactivityNudge(lastNudgeAt: string | undefined, nowMs: number): boolean {
  if (!lastNudgeAt) return true;
  const last = new Date(lastNudgeAt).getTime();
  if (isNaN(last)) return true;
  return nowMs - last >= MS_WEEK;
}

export function isInDueReminderWindow(dueAt: Date, now: Date): boolean {
  const dueMs = dueAt.getTime();
  if (isNaN(dueMs)) return false;
  const minMs = now.getTime() + DUE_REMINDER_MIN_HOURS * MS_HOUR;
  const maxMs = now.getTime() + DUE_REMINDER_MAX_HOURS * MS_HOUR;
  return dueMs >= minMs && dueMs <= maxMs;
}

export function alreadySentDueReminder(
  sentMap: Record<string, string> | undefined,
  assignmentId: string
): boolean {
  return Boolean(sentMap?.[assignmentId]);
}

export function isAssignmentIncomplete(sub: AssignmentSubmissionLike | undefined): boolean {
  return (sub?.status || "not_started") !== "completed";
}

export function studentRecipientEmail(profile: StudentProfileLike): string {
  return (profile.email || "").trim();
}

export function formatDueDateLabel(dueAt: Date): string {
  return dueAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function buildDueReminderEmail(opts: {
  firstName: string;
  assignmentTitle: string;
  dueAt: Date;
  appBaseUrl: string;
}): { subject: string; html: string; text: string } {
  const dueLabel = formatDueDateLabel(opts.dueAt);
  const link = opts.appBaseUrl.replace(/\/$/, "");
  const subject = `Reminder: "${opts.assignmentTitle}" is due soon`;
  const text =
    `Hi ${opts.firstName},\n\n` +
    `Your assignment "${opts.assignmentTitle}" is due ${dueLabel}.\n\n` +
    `Open Valley Science to finish up: ${link}\n\n` +
    `You've got this! — Valley Science`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 8px;font-size:24px;">Assignment due soon</h2>
      <p style="margin:0 0 20px;color:#64748b;line-height:1.5;">Hi ${opts.firstName}, just a friendly heads-up — you still have work to finish on this assignment.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;padding:20px;margin:0 0 20px;">
        <h3 style="margin:0 0 8px;color:#0f172a;font-size:18px;">${opts.assignmentTitle}</h3>
        <p style="margin:0;color:#64748b;font-size:14px;"><strong style="color:#0f172a;">Due:</strong> ${dueLabel}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="background:#ec4899;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">Continue in Valley Science</a>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:12px;">This reminder goes to students only — not parents.</p>
    </div>
  `;

  return { subject, html, text };
}

export function buildInactivityNudgeEmail(opts: {
  firstName: string;
  lastModuleTitle?: string;
  inactiveDays: number;
  appBaseUrl: string;
}): { subject: string; html: string; text: string } {
  const link = opts.appBaseUrl.replace(/\/$/, "");
  const resumeHint = opts.lastModuleTitle
    ? `Pick up where you left off on <strong>${opts.lastModuleTitle}</strong>.`
    : "Jump back into your dashboard and keep exploring science with Valerie.";
  const resumeText = opts.lastModuleTitle
    ? `Pick up where you left off on "${opts.lastModuleTitle}".`
    : "Jump back into your dashboard and keep exploring science with Valerie.";

  const subject = "We miss you at Valley Science!";
  const text =
    `Hi ${opts.firstName},\n\n` +
    `It's been about ${opts.inactiveDays} days since you were last active. ${resumeText}\n\n` +
    `Open Valley Science: ${link}\n\n` +
    `Learning a little each week adds up — we'd love to see you back. — Valley Science`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 8px;font-size:24px;">Ready for a quick science session?</h2>
      <p style="margin:0 0 12px;color:#64748b;line-height:1.5;">Hi ${opts.firstName}, it's been about ${opts.inactiveDays} days since your last visit. No pressure — just a gentle nudge to keep your momentum going.</p>
      <p style="margin:0 0 20px;color:#64748b;line-height:1.5;">${resumeHint}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="background:#87A96B;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">Open Valley Science</a>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:12px;">You receive this at most once a week. This goes to students only — not parents.</p>
    </div>
  `;

  return { subject, html, text };
}
