import React, { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { GHOST_BUTTON_CLASS } from '../lib/buttonStyles';

interface Classmate {
  uid: string;
  name: string;
  username?: string;
  grade?: string;
  avgScore?: number | null;
}

interface StudentClassTabProps {
  studentUid?: string;
}

export function StudentClassTab({ studentUid }: StudentClassTabProps) {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [classroomName, setClassroomName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!studentUid) return;
    setLoading(true);
    fetch('/api/student-classmates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentUid })
    })
      .then(r => r.ok ? r.json() : { classmates: [], classroomName: '' })
      .then(d => {
        setClassmates(d.classmates || []);
        setClassroomName(d.classroomName || '');
      })
      .catch(() => setClassmates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [studentUid]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">My Class</h1>
          <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">
            {classroomName ? `${classroomName} — ` : ''}Your classmates in this district section.
          </p>
        </div>
        <button
          onClick={load}
          className={`${GHOST_BUTTON_CLASS} self-start`}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden" data-tour="student-class-list">
        {classmates.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="font-black text-slate-500 dark:text-slate-400">
              {loading ? 'Loading classmates...' : 'No classmates found yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  {['Name', 'Username', 'Grade', 'Avg Score'].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classmates.map(c => (
                  <tr key={c.uid} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400 text-sm">{c.username || '—'}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">G{c.grade || '—'}</td>
                    <td className="px-6 py-4 font-black text-sage-green">{c.avgScore != null ? `${c.avgScore}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
