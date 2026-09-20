import { describe, expect, it } from 'vitest';
import {
  buildStudentChatContext,
  computeOpenAndClosedGaps,
  getModuleById,
  modulesForGrade,
  recommendNextModule,
  resolveAssignmentModules,
} from './learningContext';
import { TestResult } from '../types';

function result(gaps: string[], type: TestResult['type'] = 'placement', extra: Partial<TestResult> = {}): TestResult {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'u1',
    type,
    score: 70,
    gaps,
    timestamp: new Date().toISOString(),
    answers: [],
    ...extra,
  };
}

describe('computeOpenAndClosedGaps', () => {
  it('treats latest gaps as open and prior-only gaps as closed', () => {
    const results = [
      result(['Forces', 'Matter']),
      result(['Forces']),
    ];
    const { openGaps, closedGaps } = computeOpenAndClosedGaps(results);
    expect(openGaps).toEqual(['Forces']);
    expect(closedGaps).toEqual(['Matter']);
  });

  it('closes a module gap when the student passes that module placement test', () => {
    const results = [
      result(['Action-reaction pairs in collisions.'], 'placement', { moduleId: '8-1-1', score: 85 }),
      result(['Forces']),
    ];
    const { openGaps, closedGaps } = computeOpenAndClosedGaps(results);
    expect(openGaps).toEqual(['Forces']);
    expect(closedGaps).toContain('Action-reaction pairs in collisions.');
  });

  it('returns empty sets with no results', () => {
    expect(computeOpenAndClosedGaps([])).toEqual({ openGaps: [], closedGaps: [] });
  });
});

describe('resolveAssignmentModules', () => {
  it('resolves known curriculum module ids', () => {
    const modules = resolveAssignmentModules(['8-1-1', 'missing', '5-1-1']);
    expect(modules.map(m => m.id)).toEqual(['8-1-1', '5-1-1']);
  });
});

describe('recommendNextModule', () => {
  it('prefers a module matching an open gap', () => {
    const results = [result(['Action-reaction pairs in collisions.'])];
    const rec = recommendNextModule(results, '8');
    expect(rec.module?.id).toBe('8-1-1');
    expect(rec.gap).toContain('Action-reaction');
  });

  it('falls back to last module when no open gaps', () => {
    const rec = recommendNextModule([], '8', '8-1-2');
    expect(rec.module?.id).toBe('8-1-2');
  });

  it('falls back to first grade module', () => {
    const rec = recommendNextModule([], '5');
    expect(rec.module?.id).toBe(getModuleById('5-1-1')?.id);
  });
});

describe('buildStudentChatContext', () => {
  it('includes grade, gaps, placement, and assignment', () => {
    const ctx = buildStudentChatContext({
      grade: '8',
      moduleTitle: "Newton's Third Law",
      moduleCode: 'MS-PS2-1',
      moduleGap: 'Action-reaction pairs',
      openGaps: ['Forces'],
      closedGaps: ['Matter'],
      placementScore: 72.4,
      assignmentTitle: 'Week 1 Forces',
      lastChatTopic: 'What is inertia?',
    });
    expect(ctx).toContain('Student grade level: 8');
    expect(ctx).toContain("Newton's Third Law");
    expect(ctx).toContain('Open conceptual gaps');
    expect(ctx).toContain('Forces');
    expect(ctx).toContain('72%');
    expect(ctx).toContain('Week 1 Forces');
    expect(ctx).toContain('What is inertia?');
    expect(ctx).toContain('HARD RULES');
  });

  it('warns Valerie when the lab is not completed', () => {
    const ctx = buildStudentChatContext({
      moduleTitle: 'Balanced Forces',
      hasLab: true,
      labCompleted: false,
      sessionPhase: 'pre_lab',
    });
    expect(ctx).toContain('NOT completed');
    expect(ctx).toContain('Do NOT ask');
    expect(ctx).toContain('pre_lab');
  });

  it('allows lab questions only after completion', () => {
    const ctx = buildStudentChatContext({
      moduleTitle: 'Balanced Forces',
      hasLab: true,
      labCompleted: true,
      ahHaGoal: 'Equal forces cancel',
      learnerProfile: { prefersAnalogies: true, recentWins: ['Finished weather lab'] },
    });
    expect(ctx).toContain('HAS completed');
    expect(ctx).toContain('Equal forces cancel');
    expect(ctx).toContain('likes everyday analogies');
    expect(ctx).toContain('Finished weather lab');
  });

  it('still returns guidance with minimal input', () => {
    const ctx = buildStudentChatContext({});
    expect(ctx).toContain('HARD RULES');
    expect(ctx).toContain('Never invent');
  });
});

describe('modulesForGrade / getModuleById', () => {
  it('filters modules by grade', () => {
    const grade8 = modulesForGrade('8');
    expect(grade8.every(m => m.gradeLevel === '8')).toBe(true);
    expect(grade8.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown module ids', () => {
    expect(getModuleById('does-not-exist')).toBeUndefined();
  });
});
