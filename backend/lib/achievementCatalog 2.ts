/**
 * Server-side achievement catalog snapshot.
 *
 * When you add `achievementId` + `pointsAwarded` to a module or unit in
 * frontend/src/curriculum.ts, mirror the entry here so `/api/award-points`
 * can verify completion and grant points (server is source of truth).
 */
export interface AchievementCatalogEntry {
  achievementId: string;
  pointsAwarded: number;
  achievementLabel?: string;
  minScoreForPoints?: number;
  trigger: 'module_complete' | 'unit_test' | 'grade_test';
  source: 'module' | 'unit' | 'grade';
  sourceId: string;
}

export const ACHIEVEMENT_CATALOG: AchievementCatalogEntry[] = [
  {
    achievementId: '8-1-1-master',
    pointsAwarded: 25,
    achievementLabel: "Mastered Newton's Third Law",
    minScoreForPoints: 70,
    trigger: 'module_complete',
    source: 'module',
    sourceId: '8-1-1',
  },
  {
    achievementId: '8-1-2-master',
    pointsAwarded: 25,
    achievementLabel: 'Mastered Forces and Motion',
    minScoreForPoints: 70,
    trigger: 'module_complete',
    source: 'module',
    sourceId: '8-1-2',
  },
  {
    achievementId: '5-1-1-master',
    pointsAwarded: 25,
    achievementLabel: 'Mastered Particle Nature of Matter',
    minScoreForPoints: 70,
    trigger: 'module_complete',
    source: 'module',
    sourceId: '5-1-1',
  },
  {
    achievementId: '8-U1-master',
    pointsAwarded: 50,
    achievementLabel: 'Unit mastery: Forces and Interactions',
    minScoreForPoints: 70,
    trigger: 'unit_test',
    source: 'unit',
    sourceId: '8-U1',
  },
  {
    achievementId: '5-U1-master',
    pointsAwarded: 50,
    achievementLabel: 'Unit mastery: Structure and Properties of Matter',
    minScoreForPoints: 70,
    trigger: 'unit_test',
    source: 'unit',
    sourceId: '5-U1',
  },
];
