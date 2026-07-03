import React, { useState } from 'react';
import { School, Users, ChevronRight } from 'lucide-react';

interface Classroom {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

interface AdminDashboardProps {
  classrooms: Classroom[];
  onSelectClassroom: (id: string) => void;
}

export function AdminDashboard({ classrooms, onSelectClassroom }: AdminDashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">District Admin</h1>
        <p className="text-xl text-slate-700 font-medium">View all classrooms in your district. Click a classroom to see student progress.</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map(c => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); onSelectClassroom(c.id); }}
            className={`bg-white p-8 rounded-[32px] border-2 text-left transition-all hover:shadow-xl ${
              selectedId === c.id ? 'border-soft-pink shadow-xl' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-sage-green/10 rounded-2xl flex items-center justify-center">
                <School size={20} className="text-sage-green" />
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">{c.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Grade {c.grade}</p>
            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <Users size={16} /> {c.studentCount} students
            </p>
          </button>
        ))}
      </div>

      {classrooms.length === 0 && (
        <div className="bg-white p-12 rounded-[40px] border border-slate-100 text-center">
          <p className="font-black text-slate-500">No classrooms configured yet. Use the district sandbox to preview the teacher experience.</p>
        </div>
      )}
    </div>
  );
}
