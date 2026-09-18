import { describe, expect, it } from 'vitest';
import { getModuleById } from './learningContext';
import {
  applyTopicCompletion,
  canCompleteTopic,
  emptyLearningProgress,
  findNextLearningItem,
  getOrderedModules,
  getOrderedUnitsForGrade,
  isLessonUnlocked,
  isTopicComplete,
  isTopicUnlocked,
  sortedLessons,
  sortedTopics,
} from './learningProgression';
import { UNITS } from '../curriculum';

describe('curriculum ordering', () => {
  it('orders grade 8 modules within unit 8-U1', () => {
    const unit = UNITS.find(u => u.id === '8-U1')!;
    const modules = getOrderedModules(unit);
    expect(modules.map(m => m.id)).toEqual(['8-1-1', '8-1-2']);
  });

  it('orders lessons and topics by order field', () => {
    const mod = getModuleById('8-1-1')!;
    const lessons = sortedLessons(mod);
    expect(lessons.map(l => l.id)).toEqual(['8-1-1-L1', '8-1-1-L2', '8-1-1-L3']);
    expect(sortedTopics(lessons[0]).map(t => t.id)).toEqual(['8-1-1-L1-T1', '8-1-1-L1-T2']);
  });
});

describe('sequential unlock rules', () => {
  const mod = getModuleById('8-1-1')!;
  const lessons = sortedLessons(mod);
  const progress = emptyLearningProgress();

  it('unlocks only the first topic initially', () => {
    const firstTopic = sortedTopics(lessons[0])[0];
    const secondTopic = sortedTopics(lessons[0])[1];
    expect(isTopicUnlocked(progress, mod, lessons[0], firstTopic)).toBe(true);
    expect(isTopicUnlocked(progress, mod, lessons[0], secondTopic)).toBe(false);
    expect(isLessonUnlocked(progress, mod, lessons[1])).toBe(false);
  });

  it('unlocks next topic after prior is complete', () => {
    let p = applyTopicCompletion(progress, mod, lessons[0].id, '8-1-1-L1-T1');
    const secondTopic = sortedTopics(lessons[0])[1];
    expect(isTopicUnlocked(p, mod, lessons[0], secondTopic)).toBe(true);
    expect(isTopicComplete(p, mod.id, '8-1-1-L1-T1')).toBe(true);
  });

  it('unlocks next lesson when all topics in prior lesson are done', () => {
    let p = progress;
    for (const topic of sortedTopics(lessons[0])) {
      p = applyTopicCompletion(p, mod, lessons[0].id, topic.id);
    }
    expect(isLessonUnlocked(p, mod, lessons[1])).toBe(true);
    expect(canCompleteTopic(p, mod, lessons[1].id, sortedTopics(lessons[1])[0].id).ok).toBe(true);
  });

  it('rejects out-of-order completion', () => {
    const secondTopic = sortedTopics(lessons[0])[1];
    expect(canCompleteTopic(progress, mod, lessons[0].id, secondTopic.id).ok).toBe(false);
  });
});

describe('findNextLearningItem', () => {
  it('returns first topic for fresh student on grade 8', () => {
    const next = findNextLearningItem('8', emptyLearningProgress());
    expect(next?.module.id).toBe('8-1-1');
    expect(next?.topic.id).toBe('8-1-1-L1-T1');
  });

  it('advances after completing topics', () => {
    const mod = getModuleById('8-1-1')!;
    let p = applyTopicCompletion(emptyLearningProgress(), mod, '8-1-1-L1', '8-1-1-L1-T1');
    const next = findNextLearningItem('8', p);
    expect(next?.topic.id).toBe('8-1-1-L1-T2');
  });

  it('respects grade filter', () => {
    const next = findNextLearningItem('5', emptyLearningProgress());
    expect(next?.module.id).toBe('5-1-1');
    expect(getOrderedUnitsForGrade('5').every(u => u.gradeLevel === '5')).toBe(true);
  });
});

describe('applyTopicCompletion', () => {
  it('auto-completes module when all lessons done', () => {
    const mod = getModuleById('5-1-1')!;
    let p = emptyLearningProgress();
    for (const lesson of sortedLessons(mod)) {
      for (const topic of sortedTopics(lesson)) {
        p = applyTopicCompletion(p, mod, lesson.id, topic.id);
      }
    }
    expect(p.completedModuleIds).toContain('5-1-1');
  });
});
