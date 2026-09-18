export type TestDraftType = 'placement' | 'unit' | 'grade';

export interface TestDraft {
  currentQuestionIndex: number;
  answers: (number | string)[];
  freeResponseText: string;
  questionIds: string[];
  isFinished?: boolean;
  savedAt: string;
}

const STORAGE_PREFIX = 'vs-test-draft:';
/** Drafts older than this are ignored and removed. */
export const TEST_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function buildTestDraftKey(userId: string, testType: TestDraftType, targetId: string): string {
  return `${STORAGE_PREFIX}${userId}:${testType}:${targetId}`;
}

export function resolveTestDraftTargetId(
  testType: TestDraftType,
  options: { moduleId?: string; unitId?: string; grade: string }
): string {
  if (testType === 'placement') {
    return options.moduleId || `benchmark-${options.grade}`;
  }
  if (testType === 'unit') {
    return options.unitId || 'unknown-unit';
  }
  return options.grade;
}

export function saveTestDraft(key: string, draft: TestDraft): void {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* quota or private browsing — non-critical */
  }
}

export function loadTestDraft(key: string, questionIds: string[]): TestDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const draft = JSON.parse(raw) as TestDraft;
    if (!draft?.questionIds?.length || !draft.savedAt) {
      localStorage.removeItem(key);
      return null;
    }

    const age = Date.now() - new Date(draft.savedAt).getTime();
    if (Number.isNaN(age) || age > TEST_DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }

    if (draft.questionIds.join('|') !== questionIds.join('|')) {
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function clearTestDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
