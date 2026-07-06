import React from 'react';
import { NGSSModule } from '../types';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ModuleGridProps {
  modules: NGSSModule[];
  onSelect: (module: NGSSModule) => void;
}

export function ModuleGrid({ modules, onSelect }: ModuleGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {modules.map((module, index) => (
        <motion.div
          key={module.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(module)}
          className="group relative bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] p-8 hover:shadow-2xl dark:hover:shadow-black/30 hover:border-soft-pink transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-soft-pink/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          
          <div className="flex justify-between items-start mb-6 relative z-10">
            <span className="px-4 py-1.5 bg-cream dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-slate-100 dark:border-slate-700">
              {module.code}
            </span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Grade {module.gradeLevel}
            </span>
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 group-hover:text-soft-pink transition-colors relative z-10">
            {module.title}
          </h3>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 line-clamp-2 relative z-10 leading-relaxed">
            {module.description}
          </p>

          <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 relative z-10">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-black text-xs uppercase tracking-widest">
              Start Module
              <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform text-soft-pink" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
