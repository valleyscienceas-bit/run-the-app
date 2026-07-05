import { computeOpenAndClosedGaps } from './learningContext';
import { TestResult } from '../types';

export function formatLearningTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function computeAverageScore(results: TestResult[]): number {
  if (results.length === 0) return 0;
  return Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
}

export function computeBestScore(results: TestResult[]): number {
  if (results.length === 0) return 0;
  return Math.round(Math.max(...results.map(r => r.score)));
}

export function computeGapClosureRate(results: TestResult[]): {
  allGaps: string[];
  openGaps: string[];
  closedGaps: string[];
  gapClosureRate: number;
} {
  const allGapSet = new Set(results.flatMap(r => r.gaps));
  const { openGaps, closedGaps } = computeOpenAndClosedGaps(results);
  const allGaps = [...allGapSet];
  const gapClosureRate = allGaps.length > 0
    ? Math.round((closedGaps.length / allGaps.length) * 100)
    : 0;
  return { allGaps, openGaps, closedGaps, gapClosureRate };
}

/** Consecutive calendar days with at least one test, counting back from `now`. */
export function computeActivityStreak(results: TestResult[], now: Date = new Date()): number {
  const dayStrings = results.map(r => new Date(r.timestamp).toDateString());
  const uniqueDays = new Set(dayStrings);
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(now.getDate() - i);
    if (uniqueDays.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function isScoreTrendUp(results: TestResult[]): boolean {
  const recentAvg = results.slice(-3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-3).length, 1);
  const prevAvg = results.slice(-6, -3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-6, -3).length, 1);
  return recentAvg >= prevAvg;
}

export function mostTestedType(results: TestResult[]): string {
  const typeCounts: Record<string, number> = {};
  results.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
  return Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
}
