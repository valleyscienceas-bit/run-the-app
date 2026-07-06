import React from 'react';
import { Unit, NGSSModule, StudentLearningProgress } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { BACK_LINK_CLASS } from '../lib/buttonStyles';
import {
  computeModuleProgressPercent,
  getOrderedModules,
  isModuleComplete,
} from '../lib/learningProgression';

interface UnitViewProps {
  unit: Unit;
  progress?: StudentLearningProgress;
  onBack: () => void;
  onSelectModule: (module: NGSSModule) => void;
  onTakeUnitTest: (unit: Unit) => void;
}

export function UnitView({ unit, progress, onBack, onSelectModule, onTakeUnitTest }: UnitViewProps) {
  const modules = getOrderedModules(unit);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <button type="button" onClick={onBack} className={`${BACK_LINK_CLASS} mb-4`}>
            <ArrowLeft size={16} /> Back to curriculum
          </button>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">{unit.title}</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl">{unit.description}</p>
        </div>
      </header>

      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Modules in order</h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 -mt-2">
          You can open any module — lessons unlock one at a time inside each module.
        </p>

        <div className="relative ml-4 pl-8 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
          {modules.map((module, index) => {
            const pct = computeModuleProgressPercent(progress, module);
            const complete = isModuleComplete(progress, module);

            return (
              <motion.button
                key={module.id}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => onSelectModule(module)}
                className="relative w-full text-left group"
              >
                <div className="absolute -left-[41px] top-8 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-600 group-hover:bg-soft-pink transition-colors" />

                <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-8 hover:border-soft-pink/40 hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-4 py-1.5 bg-cream dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-slate-100 dark:border-slate-700">
                      Module {index + 1} · {module.code}
                    </span>
                    {complete ? (
                      <CheckCircle2 size={22} className="text-sage-green" />
                    ) : (
                      <ArrowRight size={20} className="text-slate-300 group-hover:text-soft-pink group-hover:translate-x-1 transition-all" />
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 group-hover:text-soft-pink transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 line-clamp-2 leading-relaxed">
                    {module.description}
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${complete ? 'bg-sage-green' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-500">{pct}%</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      {module.lessons.length} lessons
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-800 rounded-[40px] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 text-soft-pink font-black text-xs uppercase tracking-widest mb-4">
            <ClipboardCheck size={20} />
            Unit Mastery
          </div>
          <h3 className="text-3xl font-black mb-4">Ready to test your knowledge?</h3>
          <p className="text-slate-400 font-medium leading-relaxed">
            Take the comprehensive Unit Test for &quot;{unit.title}&quot;. Work through modules in order for the best preparation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onTakeUnitTest(unit)}
          className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-soft-pink hover:text-white transition-all whitespace-nowrap"
        >
          Take Unit Test <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
