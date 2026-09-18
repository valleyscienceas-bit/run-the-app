import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { createAuthUserWithRoleLabels, syncAuthUserRoleLabels } from "./authUserProvisioning.js";

export const SANDBOX_VERSION = 3;
export const SANDBOX_TEACHER_EMAIL = "sandbox.teacher@valley-science.demo";
export const SANDBOX_PASSWORD = "Sandbox123!";
export const SANDBOX_STUDENT_EMAIL = "sandbox.student1@valley-science.demo";
export const SANDBOX_PARENT_EMAIL = "sandbox.parent@valley-science.demo";
export const SANDBOX_CLASSROOM_ID = "sandbox-class-1";
export const SANDBOX_DISTRICT_ID = "sandbox-district";

export async function getOrCreateSandboxAuthUser(
  auth: Auth,
  email: string,
  password: string,
  name: string,
  role: "student" | "teacher" | "parent" = "student"
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password });
    await syncAuthUserRoleLabels(auth, existing.uid, role, name);
    return existing.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      throw err;
    }
    const created = await createAuthUserWithRoleLabels(auth, {
      email,
      password,
      role,
      name,
      emailVerified: true,
    });
    return created.uid;
  }
}

export async function resolveSandboxStudent1Uid(db: Firestore): Promise<string | null> {
  const classSnap = await db.collection("classrooms").doc(SANDBOX_CLASSROOM_ID).get();
  const studentUids = classSnap.data()?.studentUids as string[] | undefined;
  if (studentUids?.[0]) {
    return studentUids[0];
  }

  try {
    const studentSnap = await db.collection("users")
      .where("email", "==", SANDBOX_STUDENT_EMAIL)
      .limit(1)
      .get();
    if (!studentSnap.empty) {
      return studentSnap.docs[0].id;
    }
  } catch {
    // Firestore query may fail if index missing; caller may fall back to full seed.
  }

  return null;
}

export async function ensureSandboxDistrictParent(
  auth: Auth,
  db: Firestore,
  studentUid?: string | null
): Promise<string> {
  const sandboxStudent1Uid = studentUid ?? await resolveSandboxStudent1Uid(db);
  if (!sandboxStudent1Uid) {
    throw new Error("Sandbox student profile is missing. Run district sandbox seed first.");
  }

  const parentUid = await getOrCreateSandboxAuthUser(
    auth,
    SANDBOX_PARENT_EMAIL,
    SANDBOX_PASSWORD,
    "Parent of Alex M.",
    "parent"
  );

  await db.collection("users").doc(parentUid).set({
    uid: parentUid,
    name: "Parent of Alex M.",
    username: "sandbox_parent",
    email: SANDBOX_PARENT_EMAIL,
    role: "parent",
    path: "district",
    grade: "7",
    xp: 0,
    isFirstTime: false,
    isPaid: true,
    districtId: SANDBOX_DISTRICT_ID,
    linkedStudentUid: sandboxStudent1Uid,
    linkedStudentUids: [sandboxStudent1Uid],
    activeStudentUid: sandboxStudent1Uid,
    demoPassword: SANDBOX_PASSWORD,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  await db.collection("users").doc(sandboxStudent1Uid).set({
    parentUid,
    parentEmail: SANDBOX_PARENT_EMAIL,
  }, { merge: true });

  return parentUid;
}
