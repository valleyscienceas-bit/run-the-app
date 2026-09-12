import type { Firestore } from "firebase-admin/firestore";

export type LinkDistrictParentRequest = {
  studentUid: string;
  parentEmail: string;
  parentName?: string;
  requesterUid: string;
  requesterRole: "student" | "teacher";
};

export type LinkDistrictParentAuthResult =
  | { ok: true; student: Record<string, unknown>; teacher?: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export function validateParentEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Enter a valid parent email address.";
  }
  return null;
}

export function authorizeDistrictParentLink(
  request: LinkDistrictParentRequest,
  student: Record<string, unknown>,
  teacher?: Record<string, unknown>
): LinkDistrictParentAuthResult {
  const emailError = validateParentEmail(request.parentEmail);
  if (emailError) {
    return { ok: false, status: 400, error: emailError };
  }

  if (student.role !== "student") {
    return { ok: false, status: 404, error: "Student not found" };
  }
  if (student.path !== "district") {
    return { ok: false, status: 400, error: "Parent linking is only available for district student accounts." };
  }

  if (request.requesterRole === "student") {
    if (request.requesterUid !== request.studentUid) {
      return { ok: false, status: 403, error: "You can only link a parent to your own account." };
    }
    return { ok: true, student };
  }

  if (request.requesterRole === "teacher") {
    if (!teacher || teacher.role !== "teacher") {
      return { ok: false, status: 403, error: "Teacher not found" };
    }
    const teacherClassrooms = (teacher.classroomIds as string[]) || [];
    const studentClassrooms = (student.classroomIds as string[]) || [];
    const sharesClassroom = studentClassrooms.some((id) => teacherClassrooms.includes(id));
    if (!sharesClassroom && student.teacherUid !== request.requesterUid) {
      return { ok: false, status: 403, error: "Student is not in your class" };
    }
    return { ok: true, student, teacher };
  }

  return { ok: false, status: 403, error: "Unauthorized" };
}

export async function unlinkStudentFromParent(
  db: Firestore,
  oldParentUid: string | undefined,
  studentUid: string,
  newParentUid: string
): Promise<void> {
  if (!oldParentUid || oldParentUid === newParentUid) return;

  const snap = await db.collection("users").doc(oldParentUid).get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const remaining = ((data.linkedStudentUids as string[]) || []).filter((id) => id !== studentUid);
  const updates: Record<string, unknown> = {
    linkedStudentUids: remaining,
    linkedStudentUid: remaining[0] || null,
  };
  if (data.activeStudentUid === studentUid) {
    updates.activeStudentUid = remaining[0] || null;
  }
  await db.collection("users").doc(oldParentUid).update(updates);
}
