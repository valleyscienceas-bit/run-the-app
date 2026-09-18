export type AssignmentStatus = "not_started" | "in_progress" | "completed";

export interface AssignmentSubmission {
  status: AssignmentStatus;
  progress: number;
  submittedAt?: string;
  score?: number;
  completedModuleIds?: string[];
}

export interface AssignmentProgressInput {
  prev: AssignmentSubmission;
  moduleIds: string[];
  moduleId?: string;
  completedModuleId?: string;
  score?: number;
  minScore?: number | null;
}

/** Pure rules for updating a student's assignment submission. */
export function computeNextAssignmentSubmission(
  input: AssignmentProgressInput
): AssignmentSubmission {
  const { prev, moduleIds, moduleId, completedModuleId, score, minScore } = input;

  if (prev.status === "completed") {
    return {
      ...prev,
      progress: prev.progress ?? 100,
      completedModuleIds: prev.completedModuleIds || [],
    };
  }

  if (moduleIds.length === 0) {
    return { ...prev };
  }

  const completedSet = new Set<string>(prev.completedModuleIds || []);
  if (completedModuleId && moduleIds.includes(completedModuleId)) {
    completedSet.add(completedModuleId);
  }

  const total = moduleIds.length;
  const done = moduleIds.filter((id) => completedSet.has(id)).length;
  let progress = total > 0 ? Math.round((done / total) * 100) : 0;
  if (progress === 0 && (moduleId || completedModuleId)) {
    progress = Math.max(prev.progress || 0, 10);
  }

  let status: AssignmentStatus = prev.status || "not_started";
  if (done >= total && total > 0) status = "completed";
  else if (progress > 0 || moduleId || completedModuleId) status = "in_progress";

  const nextScore = score != null ? score : prev.score;
  if (
    status === "completed" &&
    minScore != null &&
    nextScore != null &&
    nextScore < minScore
  ) {
    status = "in_progress";
    progress = Math.min(progress, 90);
  }

  return {
    ...prev,
    status,
    progress,
    completedModuleIds: [...completedSet],
    ...(nextScore != null ? { score: nextScore } : {}),
    ...(status === "completed"
      ? { submittedAt: prev.submittedAt || new Date().toISOString() }
      : {}),
  };
}
