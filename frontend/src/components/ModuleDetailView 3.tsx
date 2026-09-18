import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Lock, Play } from 'lucide-react';
import { NGSSModule, StudentLearningProgress, Unit, Lesson, Topic } from '../types';
import { BACK_LINK_CLASS } from '../lib/buttonStyles';
import {
  computeModuleProgressPercent,
  isLessonComplete,
  isLessonUnlocked,
  isModuleComplete,
  isTopicComplete,
  isTopicUnlocked,
  sortedLessons,
  sortedTopics,
} from '../lib/learningProgression';

interface ModuleDetailViewProps {
  module: NGSSModule;
  unit: Unit;
  progress?: StudentLearningProgress;
  onBack: () => void;
  onSelectTopic: (module: NGSSModule, lesson: Lesson, topic: Topic) => void;
  onTakePlacementTest: (module: NGSSModule) => void;
}

export function ModuleDetailView({
  module,
  unit,
  progress,
  onBack,
  onSelectTopic,
  onTakePlacementTest,
}: ModuleDetailViewProps) {
  const pct = computeModuleProgressPercent(progress, module);
  const complete = isModuleComplete(progress, module);
  const lessons = sortedLessons(module);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <button type="button" onClick={onBack} className={`${BACK_LINK_CLASS} mb-4`}>
          <ArrowLeft size={16} /> Back to {unit.title}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{module.code}</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-3">
              {module.title}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">{module.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{pct}%</p>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {complete ? 'Module complete' : 'In progress'}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Lessons — complete in order</h2>

        {lessons.map((lesson, lessonIndex) => {
          const lessonUnlocked = isLessonUnlocked(progress, module, lesson);
          const lessonDone = isLessonComplete(progress, module, lesson);
          const topics = sortedTopics(lesson);

          return (
            <div
              key={lesson.id}
              className={`rounded-[32px] border-2 overflow-hidden ${
                lessonUnlocked
                  ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-80'
              }`}
            >
              <div className="flex items-center gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                    lessonDone
                      ? 'bg-sage-green/15 text-sage-green'
                      : lessonUnlocked
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {lessonDone ? <CheckCircle2 size={20} /> : lessonUnlocked ? lessonIndex + 1 : <Lock size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                    Lesson {lessonIndex + 1}
                  </p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{lesson.title}</h3>
                </div>
                {!lessonUnlocked && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                    Complete prior lesson
                  </span>
                )}
              </div>

              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {topics.map((topic, topicIndex) => {
                  const unlocked = isTopicUnlocked(progress, module, lesson, topic);
                  const done = isTopicComplete(progress, module.id, topic.id);

                  return (
                    <li key={topic.id}>
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => unlocked && onSelectTopic(module, lesson, topic)}
                        className={`w-full flex items-center gap-4 p-5 text-left transition-all ${
                          unlocked
                            ? 'hover:bg-soft-pink/5 cursor-pointer group'
                            : 'cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            done
                              ? 'bg-sage-green/15 text-sage-green'
                              : unlocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-soft-pink/20 group-hover:text-soft-pink'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 size={16} />
                          ) : unlocked ? (
                            <Play size={14} className="ml-0.5" />
                          ) : (
                            <Lock size={14} />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Topic {topicIndex + 1}
                          </p>
                          <p
                            className={`font-black ${
                              done
                                ? 'text-sage-green'
                                : unlocked
                                ? 'text-slate-900 dark:text-slate-100 group-hover:text-soft-pink'
                                : 'text-slate-500'
                            }`}
                          >
                            {topic.title}
                          </p>
                          {topic.description && (
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {topic.description}
                            </p>
                          )}
                        </div>
                        {unlocked && !done && (
                          <ArrowRight
                            size={18}
                            className="text-slate-300 group-hover:text-soft-pink group-hover:translate-x-1 transition-all shrink-0"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {module.placementTest && module.placementTest.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-800 rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 text-soft-pink font-black text-xs uppercase tracking-widest mb-4">
              <ClipboardCheck size={20} />
              Module check
            </div>
            <h3 className="text-2xl font-black mb-3">Ready for the module placement test?</h3>
            <p className="text-slate-400 font-medium">
              {complete
                ? 'You finished all lessons — verify your understanding with a quick check.'
                : 'Finish all lessons first, then take the placement test to confirm mastery.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTakePlacementTest(module)}
            disabled={!complete}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-soft-pink hover:text-white transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700"
          >
            Take placement test <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
