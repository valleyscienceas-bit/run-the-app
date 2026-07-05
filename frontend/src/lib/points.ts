import { FULL_CURRICULUM, UNITS } from '../curriculum';
import {
  AchievementConfig,
  AchievementSource,
  EarnedAchievement,
  NGSSModule,
  TestResult,
  Unit,
} from '../types';

/** Default minimum score to earn module/unit/grade achievement points */
export const DEFAULT_MIN_SCORE_FOR_POINTS = 70;

export type AchievementTrigger = 'module_complete' | 'unit_test' | 'grade_test';

/** Resolved achievement ready for eligibility checks and server lookup */
export interface AchievementDefinition {
  id: string;
  label: string;
  pointsAwarded: number;
  trigger: AchievementTrigger;
  source: AchievementSource;
  sourceId: string;
  minScore: number;
}

export interface AwardEligibilityContext {
  testType: TestResult['type'];
  score: number;
  targetId?: string;
  moduleId?: string;
  grade?: string;
}

export interface AwardEligibilityResult {
  eligible: boolean;
  reason?: string;
}

function configHasPoints(config: AchievementConfig | undefined): config is AchievementConfig & {
  achievementId: string;
  pointsAwarded: number;
} {
  return (
    !!config?.achievementId &&
    typeof config.pointsAwarded === 'number' &&
    config.pointsAwarded > 0
  );
}

function definitionFromConfig(
  config: AchievementConfig & { achievementId: string; pointsAwarded: number },
  trigger: AchievementTrigger,
  source: AchievementSource,
  sourceId: string,
  fallbackLabel: string
): AchievementDefinition {
  return {
    id: config.achievementId,
    label: config.achievementLabel || fallbackLabel,
    pointsAwarded: config.pointsAwarded,
    trigger,
    source,
    sourceId,
    minScore: config.minScoreForPoints ?? DEFAULT_MIN_SCORE_FOR_POINTS,
  };
}

/** Build catalog from curriculum modules and units (only entries with points configured) */
export function buildAchievementCatalog(
  modules: NGSSModule[] = FULL_CURRICULUM,
  units: Unit[] = UNITS
): AchievementDefinition[] {
  const catalog: AchievementDefinition[] = [];

  for (const mod of modules) {
    if (configHasPoints(mod)) {
      catalog.push(
        definitionFromConfig(
          mod,
          'module_complete',
          'module',
          mod.id,
          `Mastered ${mod.title}`
        )
      );
    }
  }

  for (const unit of units) {
    if (configHasPoints(unit)) {
      catalog.push(
        definitionFromConfig(
          unit,
          'unit_test',
          'unit',
          unit.id,
          `Unit mastery: ${unit.title}`
        )
      );
    }
    const gradeCfg = unit.gradeTestAchievement;
    if (configHasPoints(gradeCfg)) {
      catalog.push(
        definitionFromConfig(
          gradeCfg,
          'grade_test',
          'grade',
          unit.gradeLevel,
          `Grade ${unit.gradeLevel} science milestone`
        )
      );
    }
  }

  return catalog;
}

export function getAchievementById(
  achievementId: string,
  catalog: AchievementDefinition[] = buildAchievementCatalog()
): AchievementDefinition | undefined {
  return catalog.find(a => a.id === achievementId);
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

/** Reconcile stored total with sum of earned achievements (server should keep in sync) */
export function reconcileTotalPoints(
  totalPoints: number | undefined,
  earned: EarnedAchievement[] | undefined
): number {
  const fromEarned = computeTotalPoints(earned);
  if (typeof totalPoints === 'number' && totalPoints >= fromEarned) return totalPoints;
  return fromEarned;
}

function triggerMatchesTest(
  def: AchievementDefinition,
  ctx: AwardEligibilityContext
): boolean {
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
): AwardEligibilityResult {
  if (!def) return { eligible: false, reason: 'unknown_achievement' };
  if (hasEarnedAchievement(earned, def.id)) {
    return { eligible: false, reason: 'already_earned' };
  }
  if (!triggerMatchesTest(def, ctx)) {
    return { eligible: false, reason: 'trigger_mismatch' };
  }
  if (ctx.score < def.minScore) {
    return { eligible: false, reason: 'score_too_low' };
  }
  return { eligible: true };
}

/** Achievement IDs to attempt after a test completes (client calls API for each) */
export function resolveAchievementIdsForTest(
  ctx: AwardEligibilityContext,
  modules: NGSSModule[] = FULL_CURRICULUM,
  units: Unit[] = UNITS
): string[] {
  const catalog = buildAchievementCatalog(modules, units);
  return catalog
    .filter(def => {
      const { eligible } = checkAwardEligibility(def, ctx, []);
      return eligible;
    })
    .map(def => def.id);
}

/** Verify stored test results contain evidence for an achievement (server-side guard) */
export function verifyCompletionInResults(
  results: TestResult[],
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

export function formatPointsDisplay(totalPoints: number): string {
  if (totalPoints <= 0) return '';
  return totalPoints === 1 ? '1 point' : `${totalPoints} points`;
}

/** Snapshot entries to paste into backend/lib/achievementCatalog.ts when enabling points */
export function exportBackendCatalogEntries(
  modules: NGSSModule[] = FULL_CURRICULUM,
  units: Unit[] = UNITS
): Array<{
  achievementId: string;
  pointsAwarded: number;
  achievementLabel?: string;
  minScoreForPoints?: number;
  trigger: AchievementTrigger;
  source: AchievementSource;
  sourceId: string;
}> {
  return buildAchievementCatalog(modules, units).map(def => ({
    achievementId: def.id,
    pointsAwarded: def.pointsAwarded,
    achievementLabel: def.label,
    minScoreForPoints: def.minScore,
    trigger: def.trigger,
    source: def.source,
    sourceId: def.sourceId,
  }));
}
