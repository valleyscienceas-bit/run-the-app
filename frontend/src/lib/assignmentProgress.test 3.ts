import { describe, expect, it } from 'vitest';
import { computeNextAssignmentSubmission } from './assignmentProgress';
import { AssignmentSubmission } from '../types';

const empty: AssignmentSubmission = { status: 'not_started', progress: 0, completedModuleIds: [] };

describe('computeNextAssignmentSubmission', () => {
  it('marks in progress when a module is started', () => {
    const next = computeNextAssignmentSubmission({
      prev: empty,
      moduleIds: ['8-1-1', '8-1-2'],
      moduleId: '8-1-1',
    });
    expect(next.status).toBe('in_progress');
    expect(next.progress).toBe(10);
  });

  it('increments progress when a module is completed', () => {
    const next = computeNextAssignmentSubmission({
      prev: { status: 'in_progress', progress: 10, completedModuleIds: [] },
      moduleIds: ['8-1-1', '8-1-2'],
      completedModuleId: '8-1-1',
      score: 80,
    });
    expect(next.status).toBe('in_progress');
    expect(next.progress).toBe(50);
    expect(next.completedModuleIds).toEqual(['8-1-1']);
    expect(next.score).toBe(80);
  });

  it('marks completed when all modules are done', () => {
    const next = computeNextAssignmentSubmission({
      prev: { status: 'in_progress', progress: 50, completedModuleIds: ['8-1-1'] },
      moduleIds: ['8-1-1', '8-1-2'],
      completedModuleId: '8-1-2',
      score: 90,
    });
    expect(next.status).toBe('completed');
    expect(next.progress).toBe(100);
    expect(next.submittedAt).toBeTruthy();
  });

  it('keeps in progress when score is below minScore', () => {
    const next = computeNextAssignmentSubmission({
      prev: { status: 'in_progress', progress: 50, completedModuleIds: ['8-1-1'] },
      moduleIds: ['8-1-1', '8-1-2'],
      completedModuleId: '8-1-2',
      score: 50,
      minScore: 70,
    });
    expect(next.status).toBe('in_progress');
    expect(next.progress).toBe(90);
  });

  it('does not change a completed submission', () => {
    const prev: AssignmentSubmission = {
      status: 'completed',
      progress: 100,
      completedModuleIds: ['8-1-1'],
      submittedAt: '2026-01-01',
    };
    const next = computeNextAssignmentSubmission({
      prev,
      moduleIds: ['8-1-1'],
      moduleId: '8-1-1',
    });
    expect(next.status).toBe('completed');
    expect(next.progress).toBe(100);
  });

  it('ignores completedModuleId that is not on the assignment', () => {
    const next = computeNextAssignmentSubmission({
      prev: empty,
      moduleIds: ['8-1-1'],
      completedModuleId: '5-1-1',
      moduleId: '8-1-1',
    });
    expect(next.completedModuleIds).toEqual([]);
    expect(next.status).toBe('in_progress');
    expect(next.progress).toBe(10);
  });

  it('leaves empty module lists unchanged', () => {
    const next = computeNextAssignmentSubmission({
      prev: empty,
      moduleIds: [],
      moduleId: '8-1-1',
    });
    expect(next).toEqual(empty);
  });
});
