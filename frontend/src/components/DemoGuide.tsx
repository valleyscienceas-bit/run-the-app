import React from 'react';
import { BookOpen, MessageCircle, BarChart3, Users, Sparkles, Play } from 'lucide-react';

interface DemoGuideProps {
  demoViewRole: 'student' | 'parent';
  onStartTour: () => void;
  showTourButton: boolean;
}

export function DemoGuide({ demoViewRole, onStartTour, showTourButton }: DemoGuideProps) {
  const roleLabel = demoViewRole === 'parent' ? 'parent' : 'student';

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Demo Guide</h1>
        <p className="text-xl text-slate-700 font-medium">A quick tour of what Valley Science offers. Click around freely — this is your sandbox.</p>
      </header>

      {showTourButton && (
        <div className="bg-slate-900 text-white p-8 rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
          <div>
            <p className="text-[10px] font-black text-soft-pink uppercase tracking-widest mb-2">Recommended first step</p>
            <h2 className="text-2xl font-black mb-2">Take the {roleLabel} tour</h2>
            <p className="text-slate-300 font-medium text-sm leading-relaxed max-w-xl">
              A guided walkthrough of the {roleLabel} experience — where to find curriculum, stats, and key features.
            </p>
          </div>
          <button
            onClick={onStartTour}
            className="shrink-0 bg-soft-pink text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all"
          >
            <Play size={20} fill="currentColor" /> Take the Tour
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <GuideCard icon={<BookOpen className="text-blue-500" />} title="Curriculum" text="Browse NGSS-aligned units and modules for Grade 7. Each module targets a specific scientific concept." />
        <GuideCard icon={<MessageCircle className="text-soft-pink" />} title="Socratic Lab (Valerie)" text="Valerie is your AI science guide. She asks questions instead of giving answers, helping you think through problems." />
        <GuideCard icon={<BarChart3 className="text-sage-green" />} title="Stats Page" text="See test scores, time spent learning, and conceptual gaps identified. Parents see the same data for their child." />
        <GuideCard icon={<Users className="text-purple-500" />} title="Parent View" text="Switch to Parent using the toggle above to see how guardians monitor progress, billing, and student account info." />
      </div>

      <div className="bg-gradient-to-r from-soft-pink/20 to-sage-green/20 p-8 rounded-[32px] border border-slate-100">
        <div className="flex items-start gap-4">
          <Sparkles className="text-soft-pink shrink-0 mt-1" />
          <div>
            <h3 className="font-black text-slate-900 mb-2">What we want to help kids with</h3>
            <p className="text-slate-700 leading-relaxed">
              Most students can recite definitions but can't explain why things happen. Valley Science repairs those conceptual gaps through guided discovery, interactive simulations, and targeted assessments — so science actually makes sense.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-lg">
      <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}
