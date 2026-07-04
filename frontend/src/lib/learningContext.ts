import { FULL_CURRICULUM, UNITS } from '../curriculum';
import { GradeLevel, NGSSModule, TestResult, Unit } from '../types';

export function getModuleById(id: string): NGSSModule | undefined {
  return FULL_CURRICULUM.find(m => m.id === id);
}

export function getUnitById(id: string): Unit | undefined {
  return UNITS.find(u => u.id === id);
}

export function resolveAssignmentModules(moduleIds: string[] = []): NGSSModule[] {
  return moduleIds
    .map(id => getModuleById(id))
    .filter((m): m is NGSSModule => !!m);
}

export function modulesForGrade(grade?: GradeLevel | string): NGSSModule[] {
  if (!grade) return FULL_CURRICULUM;
  return FULL_CURRICULUM.filter(m => m.gradeLevel === grade);
}

export function computeOpenAndClosedGaps(results: TestResult[]): { openGaps: string[]; closedGaps: string[] } {
  const allGapSet = new Set(results.flatMap(r => r.gaps));
  const latest = results.length > 0 ? results[results.length - 1] : null;
  const latestGapSet = new Set(latest?.gaps || []);
  const closedGaps = [...allGapSet].filter(g => !latestGapSet.has(g));
  const openGaps = [...latestGapSet];
  return { openGaps, closedGaps };
}

/** Prefer modules whose gap text overlaps an open conceptual gap. */
export function findModuleForGap(gap: string, grade?: GradeLevel | string): NGSSModule | undefined {
  const pool = modulesForGrade(grade);
  const needle = gap.toLowerCase();
  return (
    pool.find(m => m.gap.toLowerCase().includes(needle) || needle.includes(m.gap.toLowerCase().slice(0, 20))) ||
    pool.find(m => needle.includes(m.title.toLowerCase()) || m.title.toLowerCase().includes(needle.slice(0, 12)))
  );
}

export function recommendNextModule(
  results: TestResult[],
  grade?: GradeLevel | string,
  lastModuleId?: string
): { module: NGSSModule | null; gap: string | null } {
  const { openGaps } = computeOpenAndClosedGaps(results);
  for (const gap of openGaps) {
    const mod = findModuleForGap(gap, grade);
    if (mod) return { module: mod, gap };
  }
  if (lastModuleId) {
    const last = getModuleById(lastModuleId);
    if (last) return { module: last, gap: last.gap };
  }
  const first = modulesForGrade(grade)[0] || null;
  return { module: first, gap: first?.gap || null };
}

export interface StudentChatContextInput {
  grade?: string;
  moduleTitle?: string;
  moduleCode?: string;
  moduleGap?: string;
  openGaps?: string[];
  closedGaps?: string[];
  placementScore?: number | null;
  assignmentTitle?: string;
  lastChatTopic?: string;
}

export function buildStudentChatContext(input: StudentChatContextInput): string {
  const lines: string[] = [];
  if (input.grade) lines.push(`Student grade level: ${input.grade}`);
  if (input.moduleTitle) {
    lines.push(
      `Current module: ${input.moduleTitle}${input.moduleCode ? ` (${input.moduleCode})` : ''}.` +
      (input.moduleGap ? ` Primary gap for this module: ${input.moduleGap}` : '')
    );
  }
  if (input.openGaps && input.openGaps.length > 0) {
    lines.push(`Open conceptual gaps to repair: ${input.openGaps.slice(0, 8).join('; ')}`);
  }
  if (input.closedGaps && input.closedGaps.length > 0) {
    lines.push(`Recently closed gaps (reinforce, don't re-teach from scratch): ${input.closedGaps.slice(0, 5).join('; ')}`);
  }
  if (input.placementScore != null) {
    lines.push(`Latest placement/benchmark score: ${Math.round(input.placementScore)}%`);
  }
  if (input.assignmentTitle) {
    lines.push(`Active teacher assignment: "${input.assignmentTitle}" — prioritize this work.`);
  }
  if (input.lastChatTopic) {
    lines.push(`Student's recent focus: ${input.lastChatTopic}`);
  }
  lines.push('Use this context to personalize questions. Prefer open gaps and the current module.');
  return lines.join('\n');
}
