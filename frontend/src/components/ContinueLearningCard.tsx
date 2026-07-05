import { ArrowRight, BookOpen, MessageCircle, Target } from 'lucide-react';
import { NGSSModule } from '../types';

interface ContinueLearningCardProps {
  lastModule: NGSSModule | null;
  lastChatTopic?: string | null;
  recommendedGap?: string | null;
  recommendedModule?: NGSSModule | null;
  onContinueModule: (module: NGSSModule) => void;
  onResumeChat: () => void;
  onRepairGap: (module: NGSSModule) => void;
}

export function ContinueLearningCard({
  lastModule,
  lastChatTopic,
  recommendedGap,
  recommendedModule,
  onContinueModule,
  onResumeChat,
  onRepairGap,
}: ContinueLearningCardProps) {
  const hasAnything = lastModule || lastChatTopic || (recommendedGap && recommendedModule);
  if (!hasAnything) return null;

  return (
    <div data-tour="student-continue-card" className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white p-8 md:p-10 rounded-[40px] shadow-xl border border-slate-700/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-soft-pink mb-2">Continue where you left off</p>
      <h2 className="text-2xl md:text-3xl font-black mb-6">Pick up your learning path</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lastModule && (
          <button
            type="button"
            onClick={() => onContinueModule(lastModule)}
            className="text-left bg-white/10 hover:bg-white/15 border border-white/10 rounded-3xl p-5 transition-all group"
          >
            <div className="flex items-center gap-2 text-soft-pink text-xs font-black uppercase tracking-widest mb-3">
              <BookOpen size={14} /> Last module
            </div>
            <p className="font-black text-lg mb-1 group-hover:text-soft-pink transition-colors">{lastModule.title}</p>
            <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-4">{lastModule.description}</p>
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white/80">
              Continue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        )}

        {(lastChatTopic || lastModule) && (
          <button
            type="button"
            onClick={onResumeChat}
            className="text-left bg-white/10 hover:bg-white/15 border border-white/10 rounded-3xl p-5 transition-all group"
          >
            <div className="flex items-center gap-2 text-soft-pink text-xs font-black uppercase tracking-widest mb-3">
              <MessageCircle size={14} /> Chat with Valerie
            </div>
            <p className="font-black text-lg mb-1 group-hover:text-soft-pink transition-colors">
              {lastChatTopic ? 'Resume conversation' : 'Open Socratic Lab'}
            </p>
            <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-4">
              {lastChatTopic || (lastModule ? `Keep building a mental model for ${lastModule.title}.` : 'Ask Valerie anything about science.')}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white/80">
              Resume chat <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        )}

        {recommendedGap && recommendedModule && (
          <button
            type="button"
            onClick={() => onRepairGap(recommendedModule)}
            className="text-left bg-white/10 hover:bg-white/15 border border-white/10 rounded-3xl p-5 transition-all group"
          >
            <div className="flex items-center gap-2 text-soft-pink text-xs font-black uppercase tracking-widest mb-3">
              <Target size={14} /> Next gap to repair
            </div>
            <p className="font-black text-lg mb-1 group-hover:text-soft-pink transition-colors line-clamp-2">{recommendedGap}</p>
            <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-4">
              Suggested module: {recommendedModule.title}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white/80">
              Repair gap <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
