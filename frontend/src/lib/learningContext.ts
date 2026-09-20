import { FULL_CURRICULUM, UNITS } from '../curriculum';
import {
  GradeLevel,
  NGSSModule,
  TestResult,
  Unit,
  ValerieLearnerProfile,
} from '../types';

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

/** Minimum placement score to auto-close a module's conceptual gap */
export const PASSING_MODULE_SCORE = 70;

export function computeOpenAndClosedGaps(results: TestResult[]): { openGaps: string[]; closedGaps: string[] } {
  const passedModuleIds = new Set(
    results
      .filter(r => r.type === 'placement' && r.moduleId && r.score >= PASSING_MODULE_SCORE)
      .map(r => r.moduleId as string)
  );

  const closedGapSet = new Set<string>();
  for (const mod of FULL_CURRICULUM) {
    if (passedModuleIds.has(mod.id)) closedGapSet.add(mod.gap);
  }

  const allGaps = results.flatMap(r => r.gaps || []);
  const latestGaps = results.length > 0 ? (results[results.length - 1].gaps || []) : [];

  for (const g of allGaps) {
    if (!latestGaps.includes(g)) closedGapSet.add(g);
  }

  for (const mod of FULL_CURRICULUM) {
    if (passedModuleIds.has(mod.id)) closedGapSet.add(mod.gap);
  }

  const openGaps = latestGaps.filter(g => !closedGapSet.has(g));
  return { openGaps, closedGaps: [...closedGapSet] };
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

export type ChatSessionPhase = 'open_chat' | 'pre_lab' | 'post_lab_lessons' | 'ready_for_check';

export interface StudentChatContextInput {
  grade?: string;
  moduleTitle?: string;
  moduleCode?: string;
  moduleGap?: string;
  moduleDescription?: string;
  ahHaGoal?: string;
  hasLab?: boolean;
  labCompleted?: boolean;
  lessonTitle?: string;
  topicTitle?: string;
  topicDescription?: string;
  sessionPhase?: ChatSessionPhase;
  openGaps?: string[];
  closedGaps?: string[];
  placementScore?: number | null;
  assignmentTitle?: string;
  lastChatTopic?: string;
  learnerProfile?: ValerieLearnerProfile | null;
}

export function buildStudentChatContext(input: StudentChatContextInput): string {
  const lines: string[] = [];
  if (input.grade) lines.push(`Student grade level: ${input.grade}`);

  if (input.moduleTitle) {
    lines.push(
      `Current module: ${input.moduleTitle}${input.moduleCode ? ` (${input.moduleCode})` : ''}.`
    );
    if (input.moduleDescription) lines.push(`Module about: ${input.moduleDescription}`);
    if (input.moduleGap) lines.push(`Primary gap for this module: ${input.moduleGap}`);
    if (input.ahHaGoal) lines.push(`Target ah-ha for this module: ${input.ahHaGoal}`);
  } else {
    lines.push('No specific module is selected right now (open Socratic chat).');
  }

  if (input.hasLab) {
    if (input.labCompleted) {
      lines.push(
        `LAB STATUS: The student HAS completed the interactive lab for this module. You may ask about their observations from THIS module's lab only (${input.moduleTitle}).`
      );
    } else {
      lines.push(
        `LAB STATUS: The student has NOT completed the interactive lab for this module yet. Do NOT ask "what happened in today's lab" or invent a past experiment (no car labs, no previous class labs). Invite them to try the lab, or ask what they already wonder about the topic.`
      );
    }
  } else if (input.moduleTitle) {
    lines.push('This module has no interactive lab. Teach from lessons/topics only — do not invent a lab.');
  }

  if (input.lessonTitle || input.topicTitle) {
    lines.push(
      `Current lesson/topic: ${[input.lessonTitle, input.topicTitle].filter(Boolean).join(' → ')}.` +
        (input.topicDescription ? ` Topic focus: ${input.topicDescription}` : '')
    );
  }

  if (input.sessionPhase) {
    lines.push(`Session phase: ${input.sessionPhase}`);
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
    lines.push(`Student's recent chat focus: ${input.lastChatTopic}`);
  }

  const lp = input.learnerProfile;
  if (lp) {
    const prefs: string[] = [];
    if (lp.prefersAnalogies) prefs.push('likes everyday analogies');
    if (lp.prefersShortQuestions) prefs.push('prefers short questions');
    if (lp.prefersStepByStep) prefs.push('likes step-by-step scaffolding');
    if (prefs.length) lines.push(`How this student learns best: ${prefs.join('; ')}.`);
    if (lp.recentStruggles?.length) {
      lines.push(`Recent struggles to be gentle with: ${lp.recentStruggles.slice(0, 4).join('; ')}`);
    }
    if (lp.recentWins?.length) {
      lines.push(`Recent wins to build on: ${lp.recentWins.slice(0, 4).join('; ')}`);
    }
    if (lp.coachingNotes?.length) {
      lines.push(`Coach notes: ${lp.coachingNotes.slice(0, 4).join('; ')}`);
    }
  }

  lines.push(
    'HARD RULES: Only refer to labs/experiments the student actually completed (see LAB STATUS). Never invent prior activities. Personalize using gaps and learner notes. Prefer questions over lectures.'
  );
  return lines.join('\n');
}

export function mergeValerieLearnerProfile(
  prev: ValerieLearnerProfile | undefined,
  patch: Partial<ValerieLearnerProfile>
): ValerieLearnerProfile {
  const next: ValerieLearnerProfile = { ...(prev || {}), ...patch, updatedAt: new Date().toISOString() };
  if (patch.recentWins) {
    next.recentWins = [...(prev?.recentWins || []), ...patch.recentWins].slice(-6);
  }
  if (patch.recentStruggles) {
    next.recentStruggles = [...(prev?.recentStruggles || []), ...patch.recentStruggles].slice(-6);
  }
  if (patch.coachingNotes) {
    next.coachingNotes = [...(prev?.coachingNotes || []), ...patch.coachingNotes].slice(-6);
  }
  return next;
}
