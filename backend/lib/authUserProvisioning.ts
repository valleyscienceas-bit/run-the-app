import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import {
  extractPersonNameFromAuthDisplayName,
  formatAuthDisplayName,
  isAuthDisplayNameFormatted,
  normalizeAuthRole,
} from "./authRoleLabels.js";

export type BackfillAuthRoleLabelsResult = {
  scanned: number;
  updated: number;
  skipped: number;
  errors: { uid: string; error: string }[];
};

export async function syncAuthUserRoleLabels(
  auth: Auth,
  uid: string,
  role: string,
  name?: string
): Promise<void> {
  const authRole = normalizeAuthRole(role);
  let personName = (name || "").trim();

  if (!personName) {
    try {
      const user = await auth.getUser(uid);
      personName =
        extractPersonNameFromAuthDisplayName(user.displayName || "") ||
        user.email?.split("@")[0] ||
        "User";
    } catch {
      personName = "User";
    }
  }

  const displayName = formatAuthDisplayName(authRole, personName);
  await auth.setCustomUserClaims(uid, { role: authRole });
  await auth.updateUser(uid, { displayName });
}

export async function createAuthUserWithRoleLabels(
  auth: Auth,
  params: {
    email: string;
    password: string;
    role: string;
    name: string;
    emailVerified?: boolean;
  }
): Promise<{ uid: string; displayName: string }> {
  const authRole = normalizeAuthRole(params.role);
  const displayName = formatAuthDisplayName(authRole, params.name);
  const user = await auth.createUser({
    email: params.email,
    password: params.password,
    emailVerified: params.emailVerified,
    displayName,
  });
  await auth.setCustomUserClaims(user.uid, { role: authRole });
  return { uid: user.uid, displayName };
}

export async function backfillAuthRoleLabelsFromFirestore(
  auth: Auth,
  db: Firestore,
  options?: { dryRun?: boolean }
): Promise<BackfillAuthRoleLabelsResult> {
  const dryRun = options?.dryRun ?? false;
  const result: BackfillAuthRoleLabelsResult = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const snapshot = await db.collection("users").get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = (data.uid as string) || doc.id;
    const role = data.role as string | undefined;
    if (!role || role === "founder") {
      result.skipped++;
      continue;
    }
    if (!["parent", "student", "teacher"].includes(role)) {
      result.skipped++;
      continue;
    }

    result.scanned++;

    try {
      const authUser = await auth.getUser(uid);
      const name = (data.name as string) || extractPersonNameFromAuthDisplayName(authUser.displayName || "");
      const displayName = formatAuthDisplayName(role, name);
      const claimsRole = (authUser.customClaims?.role as string | undefined) || null;

      if (
        authUser.displayName === displayName &&
        claimsRole === role &&
        isAuthDisplayNameFormatted(authUser.displayName || "", role)
      ) {
        result.skipped++;
        continue;
      }

      if (!dryRun) {
        await auth.setCustomUserClaims(uid, { role });
        await auth.updateUser(uid, { displayName });
      }
      result.updated++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("auth/user-not-found")) {
        result.skipped++;
        continue;
      }
      result.errors.push({ uid, error: message });
    }
  }

  return result;
}
