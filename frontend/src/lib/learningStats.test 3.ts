import { describe, expect, it } from 'vitest';
import {
  computeActivityStreak,
  computeAverageScore,
  computeBestScore,
  computeGapClosureRate,
  formatLearningTime,
  isScoreTrendUp,
  mostTestedType,
} from './learningStats';
import { TestResult } from '../types';

function result(partial: Partial<TestResult> & Pick<TestResult, 'score' | 'timestamp'>): TestResult {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'u1',
    type: 'placement',
    gaps: [],
    answers: [],
    ...partial,
  };
}

function dayOffset(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

describe('formatLearningTime', () => {
  it('formats seconds, minutes, and hours', () => {
    expect(formatLearningTime(0)).toBe('0s');
    expect(formatLearningTime(45)).toBe('45s');
    expect(formatLearningTime(60)).toBe('1m');
    expect(formatLearningTime(90)).toBe('1m');
    expect(formatLearningTime(3600)).toBe('1h');
    expect(formatLearningTime(3660)).toBe('1h 1m');
  });
});

describe('computeAverageScore / computeBestScore', () => {
  it('returns 0 for empty results', () => {
    expect(computeAverageScore([])).toBe(0);
    expect(computeBestScore([])).toBe(0);
  });

  it('computes average and best', () => {
    const results = [
      result({ score: 80, timestamp: dayOffset(2) }),
      result({ score: 90, timestamp: dayOffset(1) }),
      result({ score: 70, timestamp: dayOffset(0) }),
    ];
    expect(computeAverageScore(results)).toBe(80);
    expect(computeBestScore(results)).toBe(90);
  });
});

describe('computeGapClosureRate', () => {
  it('tracks open vs closed gaps across tests', () => {
    const results = [
      result({ score: 50, timestamp: dayOffset(1), gaps: ['Forces', 'Matter'] }),
      result({ score: 80, timestamp: dayOffset(0), gaps: ['Forces'] }),
    ];
    const stats = computeGapClosureRate(results);
    expect(stats.openGaps).toEqual(['Forces']);
    expect(stats.closedGaps).toEqual(['Matter']);
    expect(stats.allGaps.sort()).toEqual(['Forces', 'Matter']);
    expect(stats.gapClosureRate).toBe(50);
  });

  it('returns 0% closure with no gaps', () => {
    expect(computeGapClosureRate([])).toEqual({
      allGaps: [],
      openGaps: [],
      closedGaps: [],
      gapClosureRate: 0,
    });
  });
});

describe('computeActivityStreak', () => {
  it('counts consecutive days ending today', () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const results = [
      result({ score: 70, timestamp: dayOffset(2) }),
      result({ score: 70, timestamp: dayOffset(1) }),
      result({ score: 70, timestamp: dayOffset(0) }),
    ];
    expect(computeActivityStreak(results, now)).toBe(3);
  });

  it('stops when a day is missing', () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const results = [
      result({ score: 70, timestamp: dayOffset(3) }),
      result({ score: 70, timestamp: dayOffset(0) }),
    ];
    expect(computeActivityStreak(results, now)).toBe(1);
  });

  it('returns 0 with no activity', () => {
    expect(computeActivityStreak([], new Date())).toBe(0);
  });
});

describe('isScoreTrendUp', () => {
  it('is true when recent scores beat prior window', () => {
    const results = [
      result({ score: 40, timestamp: dayOffset(5) }),
      result({ score: 40, timestamp: dayOffset(4) }),
      result({ score: 40, timestamp: dayOffset(3) }),
      result({ score: 90, timestamp: dayOffset(2) }),
      result({ score: 90, timestamp: dayOffset(1) }),
      result({ score: 90, timestamp: dayOffset(0) }),
    ];
    expect(isScoreTrendUp(results)).toBe(true);
  });

  it('is false when recent scores drop', () => {
    const results = [
      result({ score: 90, timestamp: dayOffset(5) }),
      result({ score: 90, timestamp: dayOffset(4) }),
      result({ score: 90, timestamp: dayOffset(3) }),
      result({ score: 40, timestamp: dayOffset(2) }),
      result({ score: 40, timestamp: dayOffset(1) }),
      result({ score: 40, timestamp: dayOffset(0) }),
    ];
    expect(isScoreTrendUp(results)).toBe(false);
  });
});

describe('mostTestedType', () => {
  it('returns N/A with no results', () => {
    expect(mostTestedType([])).toBe('N/A');
  });

  it('returns the most common test type', () => {
    const results = [
      result({ score: 70, timestamp: dayOffset(2), type: 'unit' }),
      result({ score: 70, timestamp: dayOffset(1), type: 'unit' }),
      result({ score: 70, timestamp: dayOffset(0), type: 'placement' }),
    ];
    expect(mostTestedType(results)).toBe('unit');
  });
});
