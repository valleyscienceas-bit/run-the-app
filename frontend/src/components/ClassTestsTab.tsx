import React, { useState, useEffect } from 'react';
import { BarChart2, AlertTriangle } from 'lucide-react';

interface ClassTestsTabProps {
  classroomId?: string;
}

interface ClassAnalytics {
  classAverage: number;
  testsTaken: number;
  frequentMisses: { question: string; count: number }[];
}

export function ClassTestsTab({ classroomId }: ClassTestsTabProps) {
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) {
      setLoading(false);
      return;
    }
    fetch('/api/class-test-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classroomId })
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setAnalytics(d))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [classroomId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-soft-pink/30 border-t-soft-pink rounded-full animate-spin mb-6" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Loading class analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Class Tests</h1>
        <p className="text-xl text-slate-700 font-medium">Class-wide averages and frequently missed questions.</p>
      </header>

      {!analytics ? (
        <div className="bg-white p-12 rounded-[40px] border border-slate-100 text-center">
          <BarChart2 size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-500">No test data available for this classroom yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Class Average</p>
              <p className="text-5xl font-black text-sage-green">{analytics.classAverage}%</p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tests Completed</p>
              <p className="text-5xl font-black text-slate-900">{analytics.testsTaken}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" /> Frequently Missed Questions
            </h3>
            {analytics.frequentMisses.length === 0 ? (
              <p className="text-slate-500 font-medium">No missed-question data yet.</p>
            ) : (
              <ul className="space-y-3">
                {analytics.frequentMisses.map((m, i) => (
                  <li key={i} className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">{m.question}</span>
                    <span className="text-xs font-black text-orange-500 uppercase tracking-widest">{m.count} misses</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
