import React from 'react';
import { Unit, NGSSModule } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ClipboardCheck } from 'lucide-react';
import { ModuleGrid } from './ModuleGrid';

interface UnitViewProps {
  unit: Unit;
  onBack: () => void;
  onSelectModule: (module: NGSSModule) => void;
  onTakeUnitTest: (unit: Unit) => void;
}

export function UnitView({ unit, onBack, onSelectModule, onTakeUnitTest }: UnitViewProps) {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Units
          </button>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">{unit.title}</h1>
          <p className="text-xl text-slate-600 font-medium max-w-2xl">{unit.description}</p>
        </div>
      </header>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Learning Modules</h2>
        </div>
        <ModuleGrid modules={unit.modules} onSelect={onSelectModule} />
      </div>

      <div className="bg-slate-900 rounded-[40px] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 text-soft-pink font-black text-xs uppercase tracking-widest mb-4">
            <ClipboardCheck size={20} />
            Unit Mastery
          </div>
          <h3 className="text-3xl font-black mb-4">Ready to test your knowledge?</h3>
          <p className="text-slate-400 font-medium leading-relaxed">
            Take the comprehensive Unit Test for "{unit.title}". This test includes multiple choice and free response questions to verify your mental models.
          </p>
        </div>
        <button 
          onClick={() => onTakeUnitTest(unit)}
          className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-soft-pink hover:text-white transition-all whitespace-nowrap"
        >
          Take Unit Test <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
