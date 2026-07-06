import React, { useState } from 'react';
import { useProgressRefresh } from '../lib/useProgressRefresh';
import { School, Users, ChevronRight } from 'lucide-react';
import { StudentOverview } from '../types';
import { AchievementPointsDisplay, sumClassPoints } from './AchievementPointsDisplay';

interface Classroom {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

interface AdminDashboardProps {
  classrooms: Classroom[];
  students?: StudentOverview[];
  onSelectClassroom: (id: string) => void;
  onRefresh?: () => void;
}

export function AdminDashboard({ classrooms, students = [], onSelectClassroom, onRefresh }: AdminDashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const classPoints = sumClassPoints(students);

  useProgressRefresh(onRefresh ?? (() => {}));

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">District Admin</h1>
        <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">View all classrooms in your district. Click a classroom to see student progress.</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map(c => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); onSelectClassroom(c.id); }}
            className={`bg-white dark:bg-slate-900 p-8 rounded-[32px] border-2 text-left transition-all hover:shadow-xl dark:hover:shadow-black/30 ${
              selectedId === c.id ? 'border-soft-pink shadow-xl dark:shadow-black/30' : 'border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-sage-green/10 dark:bg-sage-green/15 rounded-2xl flex items-center justify-center">
                <School size={20} className="text-sage-green" />
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-1">{c.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Grade {c.grade}</p>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users size={16} /> {c.studentCount} students
            </p>
          </button>
        ))}
      </div>

      {selectedId && students.length > 0 && (
        <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-black/20">
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Classroom achievement points</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">
            Rare points earned across {students.length} student{students.length !== 1 ? 's' : ''} in this classroom.
          </p>
          <AchievementPointsDisplay totalPoints={classPoints} earnedAchievements={[]} variant="full" />
          <ul className="mt-8 space-y-2">
            {students.map(s => {
              const profile = s.studentProfile;
              if (!profile) return null;
              const pts = profile.totalPoints ?? 0;
              if (pts <= 0) return null;
              return (
                <li key={profile.uid} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{profile.name}</span>
                  <span className="font-black text-amber-800 dark:text-amber-400">{pts} pt{pts !== 1 ? 's' : ''}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {classrooms.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-slate-100 dark:border-slate-800 text-center">
          <p className="font-black text-slate-500 dark:text-slate-400">No classrooms configured yet. Use the district sandbox to preview the teacher experience.</p>
        </div>
      )}
    </div>
  );
}
