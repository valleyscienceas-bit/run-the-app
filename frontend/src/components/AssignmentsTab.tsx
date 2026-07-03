import React, { useState } from 'react';
import { ClipboardList, Calendar, Plus } from 'lucide-react';
import { GradeLevel } from '../types';

interface Assignment {
  id: string;
  title: string;
  dueAt: string;
  grade: string;
  moduleCount: number;
}

interface AssignmentsTabProps {
  classroomId?: string;
  teacherUid?: string;
}

export function AssignmentsTab({ classroomId, teacherUid }: AssignmentsTabProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', dueAt: '', grade: '7' as GradeLevel, minScore: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!classroomId) return;
    fetch('/api/classroom-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classroomId })
    })
      .then(r => r.ok ? r.json() : { assignments: [] })
      .then(d => setAssignments(d.assignments || []))
      .catch(() => setAssignments([]));
  }, [classroomId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomId || !teacherUid) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/create-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          teacherUid,
          title: form.title,
          dueAt: form.dueAt,
          grade: form.grade,
          minScore: form.minScore ? Number(form.minScore) : undefined,
          moduleIds: ['module-placeholder-1']
        })
      });
      if (!res.ok) throw new Error('Failed to create assignment');
      const data = await res.json();
      setAssignments(prev => [...prev, data.assignment]);
      setShowForm(false);
      setForm({ title: '', dueAt: '', grade: '7', minScore: '' });
      setMessage('Assignment created successfully.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Assignments</h1>
          <p className="text-xl text-slate-700 font-medium">Create and manage module assignments for your class.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all"
        >
          <Plus size={18} /> New Assignment
        </button>
      </header>

      {message && (
        <div className="p-4 bg-sage-green/10 border border-sage-green/20 rounded-2xl text-sage-green text-sm font-bold">{message}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-4">
          <h3 className="text-xl font-black text-slate-900 mb-2">Create Assignment</h3>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-5 py-4 font-bold outline-none" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Due Date & Time</label>
            <input required type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-5 py-4 font-bold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Grade</label>
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value as GradeLevel })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-5 py-4 font-bold outline-none">
                {['3','4','5','6','7','8'].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Score (optional)</label>
              <input type="number" min={0} max={100} value={form.minScore} onChange={e => setForm({ ...form, minScore: e.target.value })}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-5 py-4 font-bold outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] border border-slate-100 text-center">
            <ClipboardList size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="font-black text-slate-500">No assignments yet. Create one to get started.</p>
          </div>
        ) : (
          assignments.map(a => (
            <div key={a.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-lg">{a.title}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                  <Calendar size={14} /> Due {new Date(a.dueAt).toLocaleString()}
                </p>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Grade {a.grade}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
