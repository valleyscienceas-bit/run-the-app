import { ArrowRight, Sparkles } from 'lucide-react';
import { NextLearningItem } from '../lib/learningProgression';

interface WhatsNextCardProps {
  next: NextLearningItem | null;
  onStart: (item: NextLearningItem) => void;
}

export function WhatsNextCard({ next, onStart }: WhatsNextCardProps) {
  if (!next) {
    return (
      <div
        data-tour="student-whats-next"
        className="bg-gradient-to-br from-sage-green/10 to-emerald-50 dark:from-sage-green/10 dark:to-slate-900 border-2 border-sage-green/20 rounded-[40px] p-8 md:p-10"
      >
        <div className="flex items-center gap-2 text-sage-green text-xs font-black uppercase tracking-widest mb-3">
          <Sparkles size={14} /> What&apos;s next
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">You&apos;re caught up!</h2>
        <p className="text-slate-600 dark:text-slate-400 font-medium">
          All available lessons for your grade are complete. Review any module or take a unit test.
        </p>
      </div>
    );
  }

  const { module, lesson, topic, unit } = next;

  return (
    <div
      data-tour="student-whats-next"
      className="bg-gradient-to-br from-soft-pink/10 via-white to-blue-50 dark:from-soft-pink/10 dark:via-slate-900 dark:to-slate-900 border-2 border-soft-pink/20 rounded-[40px] p-8 md:p-10 shadow-lg shadow-soft-pink/5"
    >
      <div className="flex items-center gap-2 text-soft-pink text-xs font-black uppercase tracking-widest mb-3">
        <Sparkles size={14} /> What&apos;s next
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">{topic.title}</h2>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
        {unit.title} → {module.title} → {lesson.title}
      </p>
      {topic.description && (
        <p className="text-slate-600 dark:text-slate-400 font-medium mb-6 max-w-xl">{topic.description}</p>
      )}

      <button
        type="button"
        onClick={() => onStart(next)}
        className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-soft-pink dark:hover:bg-soft-pink dark:hover:text-white transition-all"
      >
        Continue learning <ArrowRight size={18} />
      </button>
    </div>
  );
}
