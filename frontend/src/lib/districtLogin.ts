import { UserRole } from '../types';

export function districtRoleLabel(role: UserRole | string): string {
  if (role === 'teacher') return 'Teacher';
  if (role === 'parent') return 'Parent';
  return 'Student';
}

export type LoginPath = 'individual' | 'district';

export type DistrictLoginValidation =
  | { ok: true }
  | { ok: false; message: string };

/** Validate Firestore profile matches selected login path/role (district parent/teacher/student). */
export function validateLoginPathAndRole(
  selectedPath: LoginPath,
  selectedRole: UserRole | null,
  profile: { path?: string; role?: string }
): DistrictLoginValidation {
  if (selectedPath === 'district') {
    if (profile.path !== 'district') {
      return {
        ok: false,
        message: 'This account uses Individual Access. Go back and choose Individual Access to log in.',
      };
    }
    if (selectedRole && profile.role !== selectedRole) {
      return {
        ok: false,
        message: `This account is registered as a district ${profile.role}. Select ${districtRoleLabel(profile.role!)} and try again.`,
      };
    }
    return { ok: true };
  }

  if (profile.path === 'district') {
    return {
      ok: false,
      message: 'This is a district account. Go back and choose District Partnership to log in.',
    };
  }

  return { ok: true };
}

/** District parents are provisioned by the school — no self-signup. */
export function isDistrictParentSignupBlocked(path: LoginPath, role: UserRole | null): boolean {
  return path === 'district' && role === 'parent';
}
