/** Minimal curriculum catalog for server-side progression validation. Keep in sync with frontend/src/curriculum.ts */

export interface CatalogTopic {
  id: string;
  order: number;
}

export interface CatalogLesson {
  id: string;
  order: number;
  topics: CatalogTopic[];
}

export interface CatalogModule {
  id: string;
  order: number;
  gradeLevel: string;
  unitId: string;
  lessons: CatalogLesson[];
}

function lesson(id: string, order: number, topicIds: string[]): CatalogLesson {
  return {
    id,
    order,
    topics: topicIds.map((tid, i) => ({ id: tid, order: i + 1 })),
  };
}

export const CATALOG_MODULES: CatalogModule[] = [
  {
    id: "8-1-1",
    order: 1,
    gradeLevel: "8",
    unitId: "8-U1",
    lessons: [
      lesson("8-1-1-L1", 1, ["8-1-1-L1-T1", "8-1-1-L1-T2"]),
      lesson("8-1-1-L2", 2, ["8-1-1-L2-T1", "8-1-1-L2-T2"]),
      lesson("8-1-1-L3", 3, ["8-1-1-L3-T1", "8-1-1-L3-T2"]),
    ],
  },
  {
    id: "8-1-2",
    order: 2,
    gradeLevel: "8",
    unitId: "8-U1",
    lessons: [
      lesson("8-1-2-L1", 1, ["8-1-2-L1-T1", "8-1-2-L1-T2"]),
      lesson("8-1-2-L2", 2, ["8-1-2-L2-T1", "8-1-2-L2-T2"]),
      lesson("8-1-2-L3", 3, ["8-1-2-L3-T1", "8-1-2-L3-T2"]),
    ],
  },
  {
    id: "5-1-1",
    order: 1,
    gradeLevel: "5",
    unitId: "5-U1",
    lessons: [
      lesson("5-1-1-L1", 1, ["5-1-1-L1-T1", "5-1-1-L1-T2"]),
      lesson("5-1-1-L2", 2, ["5-1-1-L2-T1", "5-1-1-L2-T2"]),
      lesson("5-1-1-L3", 3, ["5-1-1-L3-T1", "5-1-1-L3-T2"]),
    ],
  },
];

export function getCatalogModule(moduleId: string): CatalogModule | undefined {
  return CATALOG_MODULES.find(m => m.id === moduleId);
}

export interface ModuleLearningProgress {
  completedLessonIds: string[];
  completedTopicIds: string[];
  currentLessonId?: string;
  currentTopicId?: string;
}

export interface StudentLearningProgress {
  byModule: Record<string, ModuleLearningProgress>;
  completedModuleIds: string[];
}

export function emptyProgress(): StudentLearningProgress {
  return { byModule: {}, completedModuleIds: [] };
}

function moduleProgress(progress: StudentLearningProgress, moduleId: string): ModuleLearningProgress {
  const base = progress.byModule[moduleId];
  return {
    completedLessonIds: base?.completedLessonIds || [],
    completedTopicIds: base?.completedTopicIds || [],
    currentLessonId: base?.currentLessonId,
    currentTopicId: base?.currentTopicId,
  };
}

function sortedLessons(mod: CatalogModule): CatalogLesson[] {
  return [...mod.lessons].sort((a, b) => a.order - b.order);
}

function sortedTopics(lesson: CatalogLesson): CatalogTopic[] {
  return [...lesson.topics].sort((a, b) => a.order - b.order);
}

function isTopicComplete(progress: StudentLearningProgress, moduleId: string, topicId: string): boolean {
  return moduleProgress(progress, moduleId).completedTopicIds.includes(topicId);
}

function isLessonComplete(progress: StudentLearningProgress, mod: CatalogModule, lesson: CatalogLesson): boolean {
  const topics = sortedTopics(lesson);
  return topics.length > 0 && topics.every(t => isTopicComplete(progress, mod.id, t.id));
}

function isLessonUnlocked(progress: StudentLearningProgress, mod: CatalogModule, lesson: CatalogLesson): boolean {
  const lessons = sortedLessons(mod);
  const idx = lessons.findIndex(l => l.id === lesson.id);
  if (idx <= 0) return true;
  return isLessonComplete(progress, mod, lessons[idx - 1]);
}

function isTopicUnlocked(
  progress: StudentLearningProgress,
  mod: CatalogModule,
  lesson: CatalogLesson,
  topic: CatalogTopic
): boolean {
  if (!isLessonUnlocked(progress, mod, lesson)) return false;
  const topics = sortedTopics(lesson);
  const idx = topics.findIndex(t => t.id === topic.id);
  if (idx <= 0) return true;
  return isTopicComplete(progress, mod.id, topics[idx - 1].id);
}

export function canCompleteTopicServer(
  progress: StudentLearningProgress,
  moduleId: string,
  lessonId: string,
  topicId: string
): { ok: boolean; reason?: string } {
  const mod = getCatalogModule(moduleId);
  if (!mod) return { ok: false, reason: "Unknown module" };
  const lesson = mod.lessons.find(l => l.id === lessonId);
  if (!lesson) return { ok: false, reason: "Unknown lesson" };
  const topic = lesson.topics.find(t => t.id === topicId);
  if (!topic) return { ok: false, reason: "Unknown topic" };
  if (!isTopicUnlocked(progress, mod, lesson, topic)) {
    return { ok: false, reason: "Complete prior topics first" };
  }
  if (isTopicComplete(progress, mod.id, topicId)) {
    return { ok: false, reason: "Topic already complete" };
  }
  return { ok: true };
}

export function applyTopicCompletionServer(
  progress: StudentLearningProgress,
  moduleId: string,
  lessonId: string,
  topicId: string
): StudentLearningProgress {
  const check = canCompleteTopicServer(progress, moduleId, lessonId, topicId);
  if (!check.ok) return progress;

  const mod = getCatalogModule(moduleId)!;
  const prev = moduleProgress(progress, moduleId);
  const nextTopicIds = [...prev.completedTopicIds, topicId];

  let nextMp: ModuleLearningProgress = {
    ...prev,
    completedTopicIds: nextTopicIds,
    currentLessonId: lessonId,
    currentTopicId: topicId,
  };

  const lesson = mod.lessons.find(l => l.id === lessonId)!;
  const topicIds = sortedTopics(lesson).map(t => t.id);
  if (topicIds.every(id => nextTopicIds.includes(id)) && !nextMp.completedLessonIds.includes(lessonId)) {
    nextMp = { ...nextMp, completedLessonIds: [...nextMp.completedLessonIds, lessonId] };
  }

  let next: StudentLearningProgress = {
    ...progress,
    byModule: { ...progress.byModule, [moduleId]: nextMp },
  };

  const allLessonsDone = sortedLessons(mod).every(l => nextMp.completedLessonIds.includes(l.id));
  if (allLessonsDone && !next.completedModuleIds.includes(moduleId)) {
    next = { ...next, completedModuleIds: [...next.completedModuleIds, moduleId] };
  }

  return next;
}
