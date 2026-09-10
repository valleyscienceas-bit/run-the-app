import React, { useEffect, useState } from 'react';
import { Users, RefreshCw, MessageCircle } from 'lucide-react';
import { GHOST_BUTTON_CLASS } from '../lib/buttonStyles';
import { AskTeacherModal } from './AskTeacherModal';

interface Classmate {
  uid: string;
  name: string;
  username?: string;
  grade?: string;
}

interface StudentClassTabProps {
  studentUid?: string;
  unreadCount?: number;
  onUnreadChange?: (count: number) => void;
}

export function StudentClassTab({ studentUid, unreadCount = 0, onUnreadChange }: StudentClassTabProps) {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [classroomName, setClassroomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [hasClassroom, setHasClassroom] = useState(false);

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
        setHasClassroom(!!d.classroomName);
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
        <div className="flex flex-wrap items-center gap-3 self-start">
          {hasClassroom && (
            <button
              onClick={() => setAskOpen(true)}
              className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black hover:opacity-90 transition-opacity relative"
              data-tour="student-ask-teacher"
            >
              <MessageCircle size={18} />
              Ask Teacher
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={load}
            className={GHOST_BUTTON_CLASS}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
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
                  {['Name', 'Username', 'Grade'].map(h => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AskTeacherModal
        studentUid={studentUid}
        open={askOpen}
        onClose={() => setAskOpen(false)}
        onThreadRead={() => onUnreadChange?.(0)}
      />
    </div>
  );
}
