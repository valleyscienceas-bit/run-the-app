import { FULL_CURRICULUM, UNITS } from '../curriculum';
import {
  GradeLevel,
  Lesson,
  ModuleLearningProgress,
  NGSSModule,
  StudentLearningProgress,
  Topic,
  Unit,
} from '../types';

export function emptyLearningProgress(): StudentLearningProgress {
  return { byModule: {}, completedModuleIds: [] };
}

export function normalizeLearningProgress(raw?: StudentLearningProgress | null): StudentLearningProgress {
  if (!raw) return emptyLearningProgress();
  return {
    byModule: raw.byModule || {},
    completedModuleIds: raw.completedModuleIds || [],
  };
}

export function getModuleProgress(
  progress: StudentLearningProgress | undefined,
  moduleId: string
): ModuleLearningProgress {
  const base = progress?.byModule[moduleId];
  return {
    completedLessonIds: base?.completedLessonIds || [],
    completedTopicIds: base?.completedTopicIds || [],
    currentLessonId: base?.currentLessonId,
    currentTopicId: base?.currentTopicId,
  };
}

export function sortedLessons(module: NGSSModule): Lesson[] {
  return [...(module.lessons || [])].sort((a, b) => a.order - b.order);
}

export function sortedTopics(lesson: Lesson): Topic[] {
  return [...(lesson.topics || [])].sort((a, b) => a.order - b.order);
}

export function isTopicComplete(
  progress: StudentLearningProgress | undefined,
  moduleId: string,
  topicId: string
): boolean {
  return getModuleProgress(progress, moduleId).completedTopicIds.includes(topicId);
}

export function isLessonComplete(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule,
  lesson: Lesson
): boolean {
  const topics = sortedTopics(lesson);
  if (topics.length === 0) return false;
  return topics.every(t => isTopicComplete(progress, module.id, t.id));
}

export function isModuleComplete(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule
): boolean {
  if (progress?.completedModuleIds.includes(module.id)) return true;
  const lessons = sortedLessons(module);
  return lessons.length > 0 && lessons.every(l => isLessonComplete(progress, module, l));
}

export function isLessonUnlocked(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule,
  lesson: Lesson
): boolean {
  const lessons = sortedLessons(module);
  const idx = lessons.findIndex(l => l.id === lesson.id);
  if (idx <= 0) return true;
  return isLessonComplete(progress, module, lessons[idx - 1]);
}

export function isTopicUnlocked(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule,
  lesson: Lesson,
  topic: Topic
): boolean {
  if (!isLessonUnlocked(progress, module, lesson)) return false;
  const topics = sortedTopics(lesson);
  const idx = topics.findIndex(t => t.id === topic.id);
  if (idx <= 0) return true;
  return isTopicComplete(progress, module.id, topics[idx - 1].id);
}

export function canCompleteTopic(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule,
  lessonId: string,
  topicId: string
): { ok: boolean; reason?: string } {
  const lesson = module.lessons.find(l => l.id === lessonId);
  if (!lesson) return { ok: false, reason: 'Unknown lesson' };
  const topic = lesson.topics.find(t => t.id === topicId);
  if (!topic) return { ok: false, reason: 'Unknown topic' };
  if (!isTopicUnlocked(progress, module, lesson, topic)) {
    return { ok: false, reason: 'Complete prior topics first' };
  }
  if (isTopicComplete(progress, module.id, topicId)) {
    return { ok: false, reason: 'Topic already complete' };
  }
  return { ok: true };
}

function lessonFromCompletedTopics(
  progress: StudentLearningProgress,
  module: NGSSModule,
  lesson: Lesson
): ModuleLearningProgress {
  const mp = getModuleProgress(progress, module.id);
  const topicIds = sortedTopics(lesson).map(t => t.id);
  const allDone = topicIds.length > 0 && topicIds.every(id => mp.completedTopicIds.includes(id));
  const completedLessonIds = allDone && !mp.completedLessonIds.includes(lesson.id)
    ? [...mp.completedLessonIds, lesson.id]
    : mp.completedLessonIds;
  return { ...mp, completedLessonIds };
}

function moduleFromCompletedLessons(
  progress: StudentLearningProgress,
  module: NGSSModule,
  mp: ModuleLearningProgress
): StudentLearningProgress {
  const lessons = sortedLessons(module);
  const allLessonsDone = lessons.length > 0 && lessons.every(l => mp.completedLessonIds.includes(l.id));
  const completedModuleIds = allLessonsDone && !progress.completedModuleIds.includes(module.id)
    ? [...progress.completedModuleIds, module.id]
    : progress.completedModuleIds;
  return { ...progress, completedModuleIds };
}

/** Apply topic completion — auto-completes lesson/module when all children are done. */
export function applyTopicCompletion(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule,
  lessonId: string,
  topicId: string
): StudentLearningProgress {
  const check = canCompleteTopic(progress, module, lessonId, topicId);
  if (!check.ok) return normalizeLearningProgress(progress);

  const normalized = normalizeLearningProgress(progress);
  const prev = getModuleProgress(normalized, module.id);
  const nextTopicIds = prev.completedTopicIds.includes(topicId)
    ? prev.completedTopicIds
    : [...prev.completedTopicIds, topicId];

  let nextMp: ModuleLearningProgress = {
    ...prev,
    completedTopicIds: nextTopicIds,
    currentLessonId: lessonId,
    currentTopicId: topicId,
  };

  const lesson = module.lessons.find(l => l.id === lessonId);
  if (lesson) {
    const withLesson = lessonFromCompletedTopics(
      { ...normalized, byModule: { ...normalized.byModule, [module.id]: nextMp } },
      module,
      lesson
    );
    nextMp = withLesson;
  }

  let next: StudentLearningProgress = {
    ...normalized,
    byModule: { ...normalized.byModule, [module.id]: nextMp },
  };
  return moduleFromCompletedLessons(next, module, nextMp);
}

export function getOrderedUnitsForGrade(grade?: GradeLevel | string): Unit[] {
  if (!grade) return [...UNITS].sort((a, b) => `${a.gradeLevel}-${a.order}`.localeCompare(`${b.gradeLevel}-${b.order}`));
  return UNITS
    .filter(u => u.gradeLevel === grade)
    .sort((a, b) => a.order - b.order);
}

export function getOrderedModules(unit: Unit): NGSSModule[] {
  return [...unit.modules].sort((a, b) => a.order - b.order);
}

export function getOrderedModulesForGrade(grade?: GradeLevel | string): NGSSModule[] {
  return getOrderedUnitsForGrade(grade).flatMap(u => getOrderedModules(u));
}

export function computeModuleProgressPercent(
  progress: StudentLearningProgress | undefined,
  module: NGSSModule
): number {
  const lessons = sortedLessons(module);
  if (lessons.length === 0) return isModuleComplete(progress, module) ? 100 : 0;
  const totalTopics = lessons.reduce((n, l) => n + sortedTopics(l).length, 0);
  if (totalTopics === 0) return 0;
  const done = lessons.reduce(
    (n, l) => n + sortedTopics(l).filter(t => isTopicComplete(progress, module.id, t.id)).length,
    0
  );
  return Math.round((done / totalTopics) * 100);
}

export interface NextLearningItem {
  unit: Unit;
  module: NGSSModule;
  lesson: Lesson;
  topic: Topic;
}

/** First incomplete, unlocked topic in grade curriculum order. */
export function findNextLearningItem(
  grade: GradeLevel | string | undefined,
  progress: StudentLearningProgress | undefined
): NextLearningItem | null {
  for (const unit of getOrderedUnitsForGrade(grade)) {
    for (const module of getOrderedModules(unit)) {
      for (const lesson of sortedLessons(module)) {
        if (!isLessonUnlocked(progress, module, lesson)) continue;
        for (const topic of sortedTopics(lesson)) {
          if (!isTopicUnlocked(progress, module, lesson, topic)) continue;
          if (!isTopicComplete(progress, module.id, topic.id)) {
            return { unit, module, lesson, topic };
          }
        }
      }
    }
  }
  return null;
}

export function findLessonById(module: NGSSModule, lessonId: string): Lesson | undefined {
  return module.lessons.find(l => l.id === lessonId);
}

export function findTopicById(module: NGSSModule, lessonId: string, topicId: string): Topic | undefined {
  const lesson = findLessonById(module, lessonId);
  return lesson?.topics.find(t => t.id === topicId);
}

export function getModuleByIdFromCatalog(id: string): NGSSModule | undefined {
  return FULL_CURRICULUM.find(m => m.id === id);
}
