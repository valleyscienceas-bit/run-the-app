import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestDraftKey,
  clearTestDraft,
  loadTestDraft,
  resolveTestDraftTargetId,
  saveTestDraft,
  TEST_DRAFT_MAX_AGE_MS,
  type TestDraft,
} from './testDrafts';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
});

describe('buildTestDraftKey', () => {
  it('keys drafts by user, type, and target', () => {
    expect(buildTestDraftKey('u1', 'unit', 'unit-3')).toBe('vs-test-draft:u1:unit:unit-3');
  });
});

describe('resolveTestDraftTargetId', () => {
  it('uses module id for placement when present', () => {
    expect(resolveTestDraftTargetId('placement', { moduleId: 'mod-a', grade: '6' })).toBe('mod-a');
  });

  it('falls back to benchmark grade for placement', () => {
    expect(resolveTestDraftTargetId('placement', { grade: '5' })).toBe('benchmark-5');
  });

  it('uses unit id for unit tests', () => {
    expect(resolveTestDraftTargetId('unit', { unitId: 'u-2', grade: '4' })).toBe('u-2');
  });

  it('uses grade for grade tests', () => {
    expect(resolveTestDraftTargetId('grade', { grade: '7' })).toBe('7');
  });
});

describe('loadTestDraft', () => {
  const questionIds = ['q1', 'q2'];
  const key = buildTestDraftKey('user', 'grade', '6');

  const draft: TestDraft = {
    currentQuestionIndex: 1,
    answers: [0],
    freeResponseText: 'draft text',
    questionIds,
    savedAt: new Date().toISOString(),
  };

  it('restores a matching draft', () => {
    saveTestDraft(key, draft);
    expect(loadTestDraft(key, questionIds)).toEqual(draft);
  });

  it('ignores drafts with different questions', () => {
    saveTestDraft(key, draft);
    expect(loadTestDraft(key, ['other'])).toBeNull();
  });

  it('removes expired drafts', () => {
    saveTestDraft(key, {
      ...draft,
      savedAt: new Date(Date.now() - TEST_DRAFT_MAX_AGE_MS - 1).toISOString(),
    });
    expect(loadTestDraft(key, questionIds)).toBeNull();
    expect(store.has(key)).toBe(false);
  });

  it('clears draft from storage', () => {
    saveTestDraft(key, draft);
    clearTestDraft(key);
    expect(loadTestDraft(key, questionIds)).toBeNull();
  });
});
