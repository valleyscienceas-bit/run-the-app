/** Module gap snapshot — keep in sync with frontend/src/curriculum.ts */
export const MODULE_GAP_ENTRIES = [
  { id: "8-1-1", gap: "Action-reaction pairs in collisions." },
  { id: "8-1-2", gap: "Balanced vs Net force impact on acceleration." },
  { id: "5-1-1", gap: "Visualizing air as matter with mass." },
] as const;

export const PASSING_MODULE_SCORE = 70;

export interface GapTestResult {
  type?: string;
  moduleId?: string;
  score: number;
  gaps?: string[];
}

export function computeOpenAndClosedGaps(results: GapTestResult[]): {
  openGaps: string[];
  closedGaps: string[];
} {
  const passedModuleIds = new Set(
    results
      .filter(
        (r) =>
          r.type === "placement" &&
          r.moduleId &&
          r.score >= PASSING_MODULE_SCORE
      )
      .map((r) => r.moduleId as string)
  );

  const closedGapSet = new Set<string>();
  for (const mod of MODULE_GAP_ENTRIES) {
    if (passedModuleIds.has(mod.id)) closedGapSet.add(mod.gap);
  }

  const allGaps = results.flatMap((r) => r.gaps || []);
  const latestGaps =
    results.length > 0 ? results[results.length - 1].gaps || [] : [];

  for (const g of allGaps) {
    if (!latestGaps.includes(g)) closedGapSet.add(g);
  }

  for (const mod of MODULE_GAP_ENTRIES) {
    if (passedModuleIds.has(mod.id)) closedGapSet.add(mod.gap);
  }

  const openGaps = latestGaps.filter((g) => !closedGapSet.has(g));
  return { openGaps, closedGaps: [...closedGapSet] };
}
