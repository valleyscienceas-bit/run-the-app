import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Circle, Lock } from 'lucide-react';
import { Unit, NGSSModule, StudentLearningProgress } from '../types';
import { getOrderedModules, computeModuleProgressPercent, isModuleComplete } from '../lib/learningProgression';

interface CurriculumFlowViewProps {
  units: Unit[];
  progress?: StudentLearningProgress;
  onSelectModule: (unit: Unit, module: NGSSModule) => void;
  onBrowseUnit: (unit: Unit) => void;
}

export function CurriculumFlowView({ units, progress, onSelectModule, onBrowseUnit }: CurriculumFlowViewProps) {
  return (
    <div className="space-y-10" data-tour="curriculum-units">
      {units.map((unit, unitIndex) => {
        const modules = getOrderedModules(unit);
        return (
          <section key={unit.id} className="relative">
            <div className="flex items-center gap-4 mb-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-black">
                {unitIndex + 1}
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Unit {unitIndex + 1}</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{unit.title}</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">{unit.description}</p>
              </div>
            </div>

            <div className="ml-5 pl-8 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              {modules.map((module, modIndex) => (
                <ModuleFlowCard
                  key={module.id}
                  module={module}
                  stepNumber={modIndex + 1}
                  progress={progress}
                  onSelect={() => onSelectModule(unit, module)}
                />
              ))}

              <button
                type="button"
                onClick={() => onBrowseUnit(unit)}
                className="w-full text-left group flex items-center gap-4 p-5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-soft-pink/50 hover:bg-soft-pink/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-soft-pink/20">
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-soft-pink" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-100 group-hover:text-soft-pink transition-colors">
                    Browse unit — unit test & overview
                  </p>
                  <p className="text-xs font-bold text-slate-400">{modules.length} modules in sequence</p>
                </div>
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ModuleFlowCard({
  module,
  stepNumber,
  progress,
  onSelect,
}: {
  module: NGSSModule;
  stepNumber: number;
  progress?: StudentLearningProgress;
  onSelect: () => void;
}) {
  const pct = computeModuleProgressPercent(progress, module);
  const complete = isModuleComplete(progress, module);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: stepNumber * 0.05 }}
      onClick={onSelect}
      className="relative w-full text-left group"
    >
      <div className="absolute -left-[41px] top-6 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-600 group-hover:bg-soft-pink group-hover:border-soft-pink transition-colors" />

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 hover:border-soft-pink/40 hover:shadow-xl transition-all">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-cream dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-100 dark:border-slate-700">
              Module {stepNumber}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{module.code}</span>
          </div>
          {complete ? (
            <CheckCircle2 size={22} className="text-sage-green shrink-0" />
          ) : pct > 0 ? (
            <Circle size={22} className="text-blue-500 shrink-0" />
          ) : null}
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 group-hover:text-soft-pink transition-colors">
          {module.title}
        </h3>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{module.description}</p>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-sage-green' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 w-10">{pct}%</span>
        </div>

        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
          {module.lessons.length} lessons · sequential inside module
          {pct === 0 && <Lock size={12} className="inline opacity-50" aria-hidden />}
        </p>
      </div>
    </motion.button>
  );
}
