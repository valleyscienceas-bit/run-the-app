import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Brain, TrendingUp } from 'lucide-react';
import { StudentOverview } from '../types';

interface TeacherDashboardProps {
  students: StudentOverview[];
  onSelectStudent: (uid: string) => void;
  selectedOverview: StudentOverview | null;
}

export function TeacherDashboard({ students, onSelectStudent, selectedOverview }: TeacherDashboardProps) {
  const [scrollIndex, setScrollIndex] = useState(0);

  if (selectedOverview) {
    const { studentProfile, results, stats } = selectedOverview;
    const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button onClick={() => onSelectStudent('')} className="text-slate-400 font-bold text-sm hover:text-slate-600 flex items-center gap-2">
          <ChevronLeft size={16} /> Back to class list
        </button>
        <header>
          <h1 className="text-4xl font-black text-slate-900">{studentProfile?.name}'s Progress</h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MiniStat icon={<Clock className="text-blue-500" />} label="Time Learning" value={formatTime(stats?.totalSeconds || 0)} />
          <MiniStat icon={<TrendingUp className="text-sage-green" />} label="Avg Score" value={results.length ? `${avg}%` : 'N/A'} />
          <MiniStat icon={<Brain className="text-purple-500" />} label="Gaps Open" value={results.length ? String(new Set(results[results.length - 1]?.gaps || []).size) : '0'} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">My Class</h1>
        <p className="text-xl text-slate-700 font-medium">Scroll through your students and click a name for full details.</p>
      </header>

      <div className="flex items-center gap-4">
        <button onClick={() => setScrollIndex(i => Math.max(0, i - 1))} disabled={scrollIndex === 0} className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-30">
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-4 overflow-x-auto flex-1 pb-2">
          {students.slice(scrollIndex, scrollIndex + 4).map(s => {
            const avg = s.results.length ? Math.round(s.results.reduce((sum, r) => sum + r.score, 0) / s.results.length) : 0;
            return (
              <button
                key={s.studentProfile?.uid}
                onClick={() => onSelectStudent(s.studentProfile?.uid || '')}
                className="min-w-[200px] bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg hover:border-soft-pink transition-all text-left"
              >
                <p className="font-black text-slate-900 mb-1">{s.studentProfile?.name || 'Student'}</p>
                <p className="text-xs text-slate-400 font-bold mb-3">Grade {s.studentProfile?.grade}</p>
                <p className="text-2xl font-black text-sage-green">{avg}%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Score</p>
              </button>
            );
          })}
        </div>
        <button onClick={() => setScrollIndex(i => Math.min(students.length - 1, i + 1))} disabled={scrollIndex + 4 >= students.length} className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-30">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">{icon}</div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!seconds) return '0m';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
