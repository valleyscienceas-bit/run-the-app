import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface TourStep {
  title: string;
  body: string;
}

interface TourOverlayProps {
  steps: TourStep[];
  onComplete: () => void;
  onDismiss: () => void;
}

export function TourOverlay({ steps, onComplete, onDismiss }: TourOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 relative">
        <button onClick={onDismiss} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"><X size={22} /></button>
        <p className="text-xs font-black text-soft-pink uppercase tracking-widest mb-2">Step {index + 1} of {steps.length}</p>
        <h3 className="text-2xl font-black text-slate-900 mb-3">{step.title}</h3>
        <p className="text-slate-700 leading-relaxed mb-8">{step.body}</p>
        <div className="flex gap-3">
          {index > 0 && (
            <button onClick={() => setIndex(i => i - 1)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-black flex items-center justify-center gap-1">
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <button
            onClick={() => isLast ? onComplete() : setIndex(i => i + 1)}
            className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-1"
          >
            {isLast ? 'Finish Tour' : <>Next <ChevronRight size={18} /></>}
          </button>
        </div>
        {isLast && (
          <p className="text-xs text-slate-400 font-bold text-center mt-4">You can replay this tour anytime from Settings.</p>
        )}
      </div>
    </div>
  );
}

export const PARENT_TOUR_STEPS: TourStep[] = [
  { title: 'Student Progress', body: 'See your child\'s test scores, time spent learning, and conceptual gaps — all in plain language.' },
  { title: 'Student Account', body: 'View your linked student\'s profile, grade level, and account details. You can also add more students here.' },
  { title: 'Billing', body: 'Manage your subscription plan, renewal date, and auto-renew settings.' },
  { title: 'Settings', body: 'Update your password, switch light/dark mode, or replay this tour anytime.' },
];

export const STUDENT_TOUR_STEPS: TourStep[] = [
  { title: 'Curriculum', body: 'Browse your grade-level science units. Each unit contains modules aligned to NGSS standards.' },
  { title: 'Socratic Lab', body: 'Talk to Valerie, your AI science guide. She asks questions to help you think — she never gives direct answers.' },
  { title: 'Stats Page', body: 'Track your test scores, learning time, day streak, and the conceptual gaps Valerie is helping you close.' },
  { title: 'Placement Test', body: 'Your first test helps Valerie identify your starting level and build a personalized learning path.' },
];
