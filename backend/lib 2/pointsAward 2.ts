import { ACHIEVEMENT_CATALOG, type AchievementCatalogEntry } from './achievementCatalog.js';

export const DEFAULT_MIN_SCORE_FOR_POINTS = 70;

export type AchievementTrigger = 'module_complete' | 'unit_test' | 'grade_test';
export type AchievementSource = 'module' | 'unit' | 'grade';

export interface AchievementDefinition {
  id: string;
  label: string;
  pointsAwarded: number;
  trigger: AchievementTrigger;
  source: AchievementSource;
  sourceId: string;
  minScore: number;
}

export interface EarnedAchievement {
  id: string;
  label: string;
  points: number;
  earnedAt: string;
  source?: AchievementSource;
  sourceId?: string;
}

export interface AwardEligibilityContext {
  testType: 'placement' | 'unit' | 'grade';
  score: number;
  targetId?: string;
  moduleId?: string;
  grade?: string;
}

export interface TestResultLike {
  type: 'placement' | 'unit' | 'grade';
  score: number;
  targetId?: string;
  moduleId?: string;
}

function entryToDefinition(entry: AchievementCatalogEntry): AchievementDefinition {
  const fallback =
    entry.trigger === 'module_complete'
      ? `Module ${entry.sourceId}`
      : entry.trigger === 'unit_test'
      ? `Unit ${entry.sourceId}`
      : `Grade ${entry.sourceId}`;
  return {
    id: entry.achievementId,
    label: entry.achievementLabel || fallback,
    pointsAwarded: entry.pointsAwarded,
    trigger: entry.trigger,
    source: entry.source,
    sourceId: entry.sourceId,
    minScore: entry.minScoreForPoints ?? DEFAULT_MIN_SCORE_FOR_POINTS,
  };
}

export function buildAchievementCatalog(): AchievementDefinition[] {
  return ACHIEVEMENT_CATALOG.filter(e => e.pointsAwarded > 0).map(entryToDefinition);
}

export function getAchievementById(achievementId: string): AchievementDefinition | undefined {
  return buildAchievementCatalog().find(a => a.id === achievementId);
}

export function hasEarnedAchievement(
  earned: EarnedAchievement[] | undefined,
  achievementId: string
): boolean {
  return (earned ?? []).some(a => a.id === achievementId);
}

export function computeTotalPoints(earned: EarnedAchievement[] | undefined): number {
  return (earned ?? []).reduce((sum, a) => sum + (a.points || 0), 0);
}

function triggerMatchesTest(def: AchievementDefinition, ctx: AwardEligibilityContext): boolean {
  switch (def.trigger) {
    case 'module_complete':
      return ctx.testType === 'placement' && !!ctx.moduleId && def.sourceId === ctx.moduleId;
    case 'unit_test':
      return ctx.testType === 'unit' && !!ctx.targetId && def.sourceId === ctx.targetId;
    case 'grade_test':
      return ctx.testType === 'grade' && def.sourceId === (ctx.grade || ctx.targetId);
    default:
      return false;
  }
}

export function checkAwardEligibility(
  def: AchievementDefinition | undefined,
  ctx: AwardEligibilityContext,
  earned: EarnedAchievement[] | undefined
): { eligible: boolean; reason?: string } {
  if (!def) return { eligible: false, reason: 'unknown_achievement' };
  if (hasEarnedAchievement(earned, def.id)) return { eligible: false, reason: 'already_earned' };
  if (!triggerMatchesTest(def, ctx)) return { eligible: false, reason: 'trigger_mismatch' };
  if (ctx.score < def.minScore) return { eligible: false, reason: 'score_too_low' };
  return { eligible: true };
}

export function verifyCompletionInResults(
  results: TestResultLike[],
  def: AchievementDefinition,
  ctx: AwardEligibilityContext
): boolean {
  const { eligible } = checkAwardEligibility(def, ctx, []);
  if (!eligible) return false;

  return results.some(r => {
    if (r.score < def.minScore) return false;
    switch (def.trigger) {
      case 'module_complete':
        return r.type === 'placement' && (r.moduleId === def.sourceId || ctx.moduleId === def.sourceId);
      case 'unit_test':
        return r.type === 'unit' && r.targetId === def.sourceId;
      case 'grade_test':
        return r.type === 'grade' && (r.targetId === def.sourceId || ctx.grade === def.sourceId);
      default:
        return false;
    }
  });
}
