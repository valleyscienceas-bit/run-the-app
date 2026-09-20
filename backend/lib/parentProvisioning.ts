import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { createAuthUserWithRoleLabels, syncAuthUserRoleLabels } from "./authUserProvisioning.js";

export type ParentAccessPath = "individual" | "district";

export type EmailSender = (opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  context: string;
}) => Promise<{ sent: boolean; simulated: boolean; error?: string; hint?: string }>;

export type ProvisionParentParams = {
  studentUid: string;
  studentName?: string;
  parentEmail: string;
  studentGrade?: string;
  path: ParentAccessPath;
  districtId?: string;
  parentName?: string;
  initialPassword?: string;
  sendWelcomeEmail?: boolean;
};

export type ProvisionParentResult = {
  parentUid: string;
  parentDocId: string;
  created: boolean;
  emailSent?: boolean;
  emailSimulated?: boolean;
  emailError?: string;
  emailHint?: string;
};

export async function provisionParentForStudent(
  auth: Auth,
  db: Firestore,
  sendEmail: EmailSender,
  params: ProvisionParentParams
): Promise<ProvisionParentResult> {
  const {
    studentUid,
    studentName,
    parentEmail,
    studentGrade,
    path,
    districtId,
    parentName,
    initialPassword,
    sendWelcomeEmail = true,
  } = params;

  const normalizedEmail = parentEmail.trim().toLowerCase();
  const displayName = parentName || (studentName ? `Parent of ${studentName}` : "Parent");
  const parentDocId = `parent_${studentUid}`;

  let parentAuthUid: string;
  let createdAuth = false;

  try {
    const existingUser = await auth.getUserByEmail(normalizedEmail);
    parentAuthUid = existingUser.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/user-not-found") {
      const password = initialPassword || Math.random().toString(36).slice(-12) + "A1!";
      const created = await createAuthUserWithRoleLabels(auth, {
        email: normalizedEmail,
        emailVerified: false,
        role: "parent",
        name: displayName,
        password,
      });
      parentAuthUid = created.uid;
      createdAuth = true;
    } else {
      throw err;
    }
  }

  const existingParentSnap = await db.collection("users").doc(parentAuthUid).get();
  const existingParent = existingParentSnap.exists ? existingParentSnap.data()! : null;

  const existingLinked: string[] = existingParent?.linkedStudentUids
    || (existingParent?.linkedStudentUid ? [existingParent.linkedStudentUid] : []);
  const linkedStudentUids = existingLinked.includes(studentUid)
    ? existingLinked
    : [...existingLinked, studentUid];

  await syncAuthUserRoleLabels(
    auth,
    parentAuthUid,
    "parent",
    existingParent?.name || displayName
  );

  const parentProfile: Record<string, unknown> = {
    uid: parentAuthUid,
    linkedStudentUid: linkedStudentUids[0],
    linkedStudentUids,
    activeStudentUid: studentUid,
    name: existingParent?.name || displayName,
    username: existingParent?.username || `parent_${studentUid.slice(-6)}`,
    email: normalizedEmail,
    role: "parent",
    path: existingParent?.path || path,
    grade: studentGrade || existingParent?.grade || "6",
    xp: existingParent?.xp ?? 0,
    isFirstTime: existingParent?.isFirstTime ?? true,
    isPaid: true,
    hasLoggedInBefore: existingParent?.hasLoggedInBefore === true ? true : false,
    createdAt: existingParent?.createdAt || new Date().toISOString(),
  };

  if ((path === "district" || existingParent?.path === "district") && districtId) {
    parentProfile.districtId = districtId;
  }
  if (path === "district" && initialPassword) {
    parentProfile.demoPassword = initialPassword;
  }

  await db.collection("users").doc(parentAuthUid).set(parentProfile, { merge: true });
  await db.collection("users").doc(parentDocId).set(
    { ...parentProfile, uid: parentDocId, authUid: parentAuthUid },
    { merge: true }
  );

  await db.collection("users").doc(studentUid).set(
    { parentUid: parentAuthUid, parentEmail: normalizedEmail },
    { merge: true }
  );

  // Only email once. Do NOT re-send on every login/payment while hasLoggedInBefore is still false.
  const alreadyEmailed = existingParent?.welcomeEmailSentAt != null;
  const shouldEmail = Boolean(sendWelcomeEmail) && !alreadyEmailed;
  if (shouldEmail) {
    const resetLink = await auth.generatePasswordResetLink(normalizedEmail);
    const accessPath = (existingParent?.path || path) as ParentAccessPath;
    const loginSteps = accessPath === "district"
      ? `<li>Select <strong>District Partnership → Parent</strong></li>`
      : `<li>Select <strong>Individual Access → Parent</strong></li>`;

    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 520px;">
        <h2 style="color: #0f172a;">Your Valley Science Parent Account is Ready</h2>
        <p>A parent monitoring account has been created for you to track <strong>${studentName || "your student"}'s</strong> science progress.</p>
        <p><strong>Password tip:</strong> Use at least 8 characters with a letter and a number (same rules as student accounts).</p>
        <p>Click the button below to set your password and access your dashboard:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #ec4899; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">Set Your Password</a>
        </div>
        <div style="background: #f8fafc; padding: 16px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>To log in after setting your password:</strong></p>
          <ol style="font-size: 14px; color: #475569; margin: 8px 0 0;">
            <li>Go to the Valley Science login page</li>
            ${loginSteps}
            <li>Enter your email: <strong>${normalizedEmail}</strong></li>
          </ol>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">If you didn't expect this email, you can safely ignore it.</p>
        <p style="color: #94a3b8; font-size: 13px;">If the button doesn't work, copy this link: <a href="${resetLink}">${resetLink}</a></p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `${studentName || "Your student"} — Set up your Valley Science parent account`,
      html: emailHtml,
      text: `Set your Valley Science parent password (8+ chars, letter + number): ${resetLink}`,
      context: accessPath === "district" ? "provision-district-parent" : "provision-parent",
    });

    if (emailResult.sent || emailResult.simulated) {
      const sentAt = new Date().toISOString();
      await db.collection("users").doc(parentAuthUid).set({ welcomeEmailSentAt: sentAt }, { merge: true });
      await db.collection("users").doc(parentDocId).set({ welcomeEmailSentAt: sentAt }, { merge: true });
    }

    return {
      parentUid: parentAuthUid,
      parentDocId,
      created: createdAuth,
      emailSent: emailResult.sent,
      emailSimulated: emailResult.simulated,
      emailError: emailResult.error,
      emailHint: emailResult.hint,
    };
  }

  return { parentUid: parentAuthUid, parentDocId, created: createdAuth };
}
