import { describe, expect, it } from 'vitest';
import {
  districtRoleLabel,
  isDistrictParentSignupBlocked,
  validateLoginPathAndRole,
} from './districtLogin';

describe('districtRoleLabel', () => {
  it('labels parent, teacher, and student roles', () => {
    expect(districtRoleLabel('parent')).toBe('Parent');
    expect(districtRoleLabel('teacher')).toBe('Teacher');
    expect(districtRoleLabel('student')).toBe('Student');
  });
});

describe('validateLoginPathAndRole', () => {
  const districtParent = { path: 'district', role: 'parent' };
  const districtStudent = { path: 'district', role: 'student' };
  const individualParent = { path: 'individual', role: 'parent' };

  it('allows district parent login when path and role match', () => {
    expect(validateLoginPathAndRole('district', 'parent', districtParent)).toEqual({ ok: true });
  });

  it('rejects district login for individual accounts', () => {
    const result = validateLoginPathAndRole('district', 'parent', individualParent);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.message).toContain('Individual Access');
    }
  });

  it('rejects wrong district role selection', () => {
    const result = validateLoginPathAndRole('district', 'student', districtParent);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.message).toContain('district parent');
      expect(result.message).toContain('Parent');
    }
  });

  it('rejects individual login for district accounts', () => {
    const result = validateLoginPathAndRole('individual', 'parent', districtParent);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.message).toContain('District Partnership');
    }
  });

  it('allows individual parent login on individual path', () => {
    expect(validateLoginPathAndRole('individual', 'parent', individualParent)).toEqual({ ok: true });
  });

  it('allows district student without role mismatch when role omitted', () => {
    expect(validateLoginPathAndRole('district', null, districtStudent)).toEqual({ ok: true });
  });
});

describe('isDistrictParentSignupBlocked', () => {
  it('blocks district parent self-signup', () => {
    expect(isDistrictParentSignupBlocked('district', 'parent')).toBe(true);
  });

  it('does not block district teacher or student flows', () => {
    expect(isDistrictParentSignupBlocked('district', 'teacher')).toBe(false);
    expect(isDistrictParentSignupBlocked('district', 'student')).toBe(false);
  });

  it('does not block individual signup paths', () => {
    expect(isDistrictParentSignupBlocked('individual', 'parent')).toBe(false);
  });
});
