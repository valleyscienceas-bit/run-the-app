import { describe, expect, it } from 'vitest';
import {
  buildAchievementCatalog,
  checkAwardEligibility,
  computeTotalPoints,
  getAchievementById,
  hasEarnedAchievement,
  reconcileTotalPoints,
  resolveAchievementIdsForTest,
  verifyCompletionInResults,
} from './points';
import { EarnedAchievement, NGSSModule, TestResult, Unit } from '../types';

const sampleModule: NGSSModule = {
  id: 'mod-1',
  gradeLevel: '6',
  unitId: 'u-1',
  order: 1,
  code: 'MS-PS1-1',
  title: 'Particle Model',
  gap: 'Matter particles',
  description: 'Test module',
  lessons: [{ id: 'mod-1-L1', title: 'Intro', order: 1, topics: [{ id: 'mod-1-L1-T1', title: 'Topic', order: 1 }] }],
  achievementId: 'mod-1-master',
  pointsAwarded: 25,
  minScoreForPoints: 80,
};

const sampleUnit: Unit = {
  id: 'u-1',
  gradeLevel: '6',
  order: 1,
  title: 'Matter',
  description: 'Unit',
  modules: [],
  unitTest: [],
  achievementId: 'u-1-master',
  pointsAwarded: 50,
};

const gradeCfg = {
  achievementId: 'grade-6-milestone',
  pointsAwarded: 100,
  achievementLabel: 'Grade 6 Scholar',
};

const unitWithGrade: Unit = {
  ...sampleUnit,
  id: 'u-2',
  gradeTestAchievement: gradeCfg,
};

function earned(partial: Partial<EarnedAchievement> & Pick<EarnedAchievement, 'id' | 'points'>): EarnedAchievement {
  return {
    label: partial.label || partial.id,
    earnedAt: partial.earnedAt || new Date().toISOString(),
    ...partial,
  };
}

function result(partial: Partial<TestResult> & Pick<TestResult, 'type' | 'score'>): TestResult {
  return {
    id: 'r1',
    userId: 'u1',
    gaps: [],
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

describe('buildAchievementCatalog', () => {
  it('includes only modules/units with points configured', () => {
    const catalog = buildAchievementCatalog(
      [sampleModule, { ...sampleModule, id: 'mod-2', achievementId: undefined, pointsAwarded: undefined }],
      [sampleUnit, unitWithGrade]
    );
    const ids = catalog.map(c => c.id);
    expect(ids).toContain('mod-1-master');
    expect(ids).toContain('u-1-master');
    expect(ids).toContain('grade-6-milestone');
    expect(ids).not.toContain('mod-2');
  });

  it('ignores zero or negative point values', () => {
    const catalog = buildAchievementCatalog([
      { ...sampleModule, id: 'x', achievementId: 'zero', pointsAwarded: 0 },
    ]);
    expect(catalog.find(a => a.id === 'zero')).toBeUndefined();
  });
});

describe('computeTotalPoints / hasEarnedAchievement', () => {
  it('sums earned achievement points', () => {
    const list = [
      earned({ id: 'a', points: 25, label: 'A' }),
      earned({ id: 'b', points: 50, label: 'B' }),
    ];
    expect(computeTotalPoints(list)).toBe(75);
    expect(hasEarnedAchievement(list, 'a')).toBe(true);
    expect(hasEarnedAchievement(list, 'c')).toBe(false);
  });

  it('reconciles total with earned sum', () => {
    const list = [earned({ id: 'a', points: 10, label: 'A' })];
    expect(reconcileTotalPoints(10, list)).toBe(10);
    expect(reconcileTotalPoints(undefined, list)).toBe(10);
    expect(reconcileTotalPoints(15, list)).toBe(15);
  });
});

describe('checkAwardEligibility', () => {
  const def = getAchievementById('mod-1-master', buildAchievementCatalog([sampleModule], []))!;

  it('requires matching trigger, score, and no prior award', () => {
    expect(
      checkAwardEligibility(def, { testType: 'placement', score: 85, moduleId: 'mod-1' }, [])
    ).toEqual({ eligible: true });

    expect(
      checkAwardEligibility(def, { testType: 'unit', score: 85, moduleId: 'mod-1' }, [])
    ).toEqual({ eligible: false, reason: 'trigger_mismatch' });

    expect(
      checkAwardEligibility(def, { testType: 'placement', score: 70, moduleId: 'mod-1' }, [])
    ).toEqual({ eligible: false, reason: 'score_too_low' });

    expect(
      checkAwardEligibility(def, { testType: 'placement', score: 85, moduleId: 'mod-1' }, [
        earned({ id: 'mod-1-master', points: 25, label: 'X' }),
      ])
    ).toEqual({ eligible: false, reason: 'already_earned' });
  });
});

describe('resolveAchievementIdsForTest', () => {
  it('returns ids for eligible completions only', () => {
    const ids = resolveAchievementIdsForTest(
      { testType: 'unit', score: 90, targetId: 'u-1' },
      [sampleModule],
      [sampleUnit]
    );
    expect(ids).toContain('u-1-master');
    expect(ids).not.toContain('mod-1-master');
  });
});

describe('verifyCompletionInResults', () => {
  it('confirms matching stored test result', () => {
    const catalog = buildAchievementCatalog([sampleModule], [sampleUnit]);
    const def = catalog.find(a => a.id === 'u-1-master')!;
    const results = [result({ type: 'unit', score: 88, targetId: 'u-1' })];
    const ctx = { testType: 'unit' as const, score: 88, targetId: 'u-1' };
    expect(verifyCompletionInResults(results, def, ctx)).toBe(true);
    expect(verifyCompletionInResults([], def, ctx)).toBe(false);
  });
});
