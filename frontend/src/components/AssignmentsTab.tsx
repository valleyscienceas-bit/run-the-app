import React, { useState } from 'react';
import { ClipboardList, Calendar, Plus, ChevronLeft, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { GradeLevel, ClassroomAssignment, AssignmentStudentRow, AssignmentSubmission } from '../types';

type AssignmentSummary = { completed: number; inProgress: number; notStarted: number; late: number; total: number };

function computeAssignmentSummary(assignment: ClassroomAssignment): AssignmentSummary {
  const submissions = assignment.submissions || {};
  const dueAt = new Date(assignment.dueAt);
  const now = new Date();
  let completed = 0, inProgress = 0, notStarted = 0, late = 0;
  for (const sub of Object.values(submissions) as AssignmentSubmission[]) {
    const status = sub.status || 'not_started';
    if (status === 'completed') completed++;
    else if (status === 'in_progress') inProgress++;
    else notStarted++;
    if (status !== 'completed' && dueAt < now) late++;
  }
  return { completed, inProgress, notStarted, late, total: Object.keys(submissions).length };
}
import { INPUT_CLASS_PX } from '../lib/formStyles';
import { BACK_LINK_CLASS, CANCEL_BUTTON_CLASS, DANGER_LINK_CLASS } from '../lib/buttonStyles';
import { DueDateTimeInput } from './DueDateTimeInput';

interface AssignmentsTabProps {
  classroomId?: string;
  teacherUid?: string;
  fallbackClassroomId?: string;
}

export function AssignmentsTab({ classroomId, teacherUid, fallbackClassroomId }: AssignmentsTabProps) {
  const effectiveClassroomId = classroomId || fallbackClassroomId;
  const [assignments, setAssignments] = useState<ClassroomAssignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailStudents, setDetailStudents] = useState<AssignmentStudentRow[]>([]);
  const [detailSummary, setDetailSummary] = useState<AssignmentSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ title: '', dueAt: '', grade: '7' as GradeLevel, minScore: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showMessage = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const loadAssignments = React.useCallback(() => {
    if (!effectiveClassroomId) return;
    fetch('/api/classroom-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classroomId: effectiveClassroomId })
    })
      .then(r => r.ok ? r.json() : { assignments: [] })
      .then(d => setAssignments(d.assignments || []))
      .catch(() => setAssignments([]));
  }, [effectiveClassroomId]);

  React.useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const now = new Date();
  const current = assignments.filter(a => new Date(a.dueAt) >= now).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const past = assignments.filter(a => new Date(a.dueAt) < now).sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());

  const openDetail = async (assignmentId: string) => {
    if (!teacherUid) return;
    setSelectedId(assignmentId);
    setDetailLoading(true);
    try {
      const res = await fetch('/api/assignment-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, teacherUid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetailStudents(data.students || []);
      setDetailSummary(data.summary || null);
    } catch (err: any) {
      showMessage(err.message || 'Failed to load assignment details.', true);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (assignmentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!teacherUid) return;
    setDeleteTargetId(assignmentId);
  };

  const confirmDelete = async () => {
    if (!teacherUid || !deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/delete-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: deleteTargetId, teacherUid })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setAssignments(prev => prev.filter(a => a.id !== deleteTargetId));
      if (selectedId === deleteTargetId) setSelectedId(null);
      showMessage('Assignment deleted.');
      setDeleteTargetId(null);
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete assignment.', true);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveClassroomId) {
      showMessage('No classroom loaded. Refresh the page or contact your admin.', true);
      return;
    }
    if (!teacherUid) {
      showMessage('Teacher session not found. Please log in again.', true);
      return;
    }
    if (!form.dueAt) {
      showMessage('Please set a due date and time.', true);
      return;
    }
    setLoading(true);
    setMessage(null);
    setMessageIsError(false);
    try {
      const dueAtIso = form.dueAt;
      const res = await fetch('/api/create-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: effectiveClassroomId,
          teacherUid,
          title: form.title,
          dueAt: dueAtIso,
          grade: form.grade,
          minScore: form.minScore ? Number(form.minScore) : undefined,
          moduleIds: ['module-placeholder-1']
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create assignment');
      setAssignments(prev => [...prev, data.assignment]);
      setShowForm(false);
      setForm({ title: '', dueAt: '', grade: '7', minScore: '' });
      showMessage('Assignment created successfully.');
    } catch (err: any) {
      const isNetwork = !err?.message || /failed to fetch|load failed|networkerror/i.test(err.message);
      showMessage(
        isNetwork
          ? 'Could not reach the server. Make sure the backend is running (port 3001).'
          : (err?.message || 'Failed to create assignment'),
        true
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedAssignment = assignments.find(a => a.id === selectedId);

  if (selectedId && selectedAssignment) {
    const isPast = new Date(selectedAssignment.dueAt) < now;
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button onClick={() => setSelectedId(null)} className={BACK_LINK_CLASS}>
          <ChevronLeft size={16} /> Back to assignments
        </button>

        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${isPast ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-sage-green/20 text-sage-green'}`}>
              {isPast ? 'Past Assignment' : 'Current Assignment'}
            </span>
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100">{selectedAssignment.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-2">
              <Calendar size={16} /> Due {new Date(selectedAssignment.dueAt).toLocaleString()} · Grade {selectedAssignment.grade}
            </p>
          </div>
          <button
            onClick={() => handleDelete(selectedId)}
            className={DANGER_LINK_CLASS}
          >
            <Trash2 size={16} /> Delete
          </button>
        </header>

        {detailSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={<CheckCircle2 className="text-sage-green" />} label="Turned In" value={detailSummary.completed} total={detailSummary.total} color="green" />
            <SummaryCard icon={<Clock className="text-blue-500" />} label="In Progress" value={detailSummary.inProgress} total={detailSummary.total} color="blue" />
            <SummaryCard icon={<AlertCircle className="text-slate-400" />} label="Not Started" value={detailSummary.notStarted} total={detailSummary.total} color="slate" />
            <SummaryCard icon={<AlertCircle className="text-orange-500" />} label="Late / Missing" value={detailSummary.late} total={detailSummary.total} color="orange" />
          </div>
        )}

        {detailLoading ? (
          <div className="py-16 text-center text-slate-400 font-bold">Loading student progress...</div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  {['Student', 'Status', 'Progress', 'Score', 'Submitted'].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailStudents.map(row => (
                  <tr key={row.uid} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-900 dark:text-slate-100">{row.name}</p>
                      <p className="text-xs text-slate-400">{row.username}</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} isLate={row.isLate} />
                    </td>
                    <td className="px-5 py-4 min-w-[180px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${row.status === 'completed' ? 'bg-sage-green' : row.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-500 w-10">{row.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {row.score != null ? `${row.score}%` : '—'}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-400">
                      {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Assignments</h1>
          <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">Create, track, and review module assignments.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-4 rounded-2xl font-black hover:opacity-90 transition-all"
        >
          <Plus size={18} /> New Assignment
        </button>
      </header>

      {!effectiveClassroomId && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl text-orange-700 dark:text-orange-300 text-sm font-bold">
          No classroom loaded. Assignments require an active classroom.
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-2xl text-sm font-bold border ${
          messageIsError
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
            : 'bg-sage-green/10 border-sage-green/20 text-sage-green'
        }`}>{message}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Create Assignment</h3>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={INPUT_CLASS_PX} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Due Date & Time</label>
            <DueDateTimeInput
              required
              value={form.dueAt}
              onChange={dueAt => setForm({ ...form, dueAt })}
            />
            <p className="text-xs text-slate-400 mt-2 font-medium">Click AM/PM to switch, or press A/P while editing the time.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Grade</label>
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value as GradeLevel })} className={INPUT_CLASS_PX}>
                {['3','4','5','6','7','8'].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Score (optional)</label>
              <input type="number" min={0} max={100} value={form.minScore} onChange={e => setForm({ ...form, minScore: e.target.value })} className={INPUT_CLASS_PX} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className={CANCEL_BUTTON_CLASS}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <AssignmentSection title="Current Assignments" empty="No current assignments." items={current} onOpen={openDetail} onDelete={handleDelete} />
      <AssignmentSection title="Past Assignments" empty="No past assignments yet." items={past} onOpen={openDetail} onDelete={handleDelete} isPast />

      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Delete assignment?</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">This cannot be undone. Student progress on this assignment will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTargetId(null)} disabled={deleting} className={CANCEL_BUTTON_CLASS}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-black disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentSection({ title, empty, items, onOpen, onDelete, isPast }: {
  title: string; empty: string; items: ClassroomAssignment[];
  onOpen: (id: string) => void; onDelete: (id: string, e: React.MouseEvent) => void; isPast?: boolean;
}) {
  return (
    <section data-tour="teacher-assignments-list">
      <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500 dark:text-slate-400">{empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpen(a.id)}
              className="w-full bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg hover:border-soft-pink/40 transition-all flex items-center justify-between text-left group"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg group-hover:text-soft-pink transition-colors">{a.title}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                  <Calendar size={14} /> Due {new Date(a.dueAt).toLocaleString()}
                  {isPast && <span className="text-orange-500">· Past due</span>}
                </p>
                <AssignmentCardStats assignment={a} />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Grade {a.grade}</span>
                <button
                  type="button"
                  onClick={e => onDelete(a.id, e)}
                  className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label="Delete assignment"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function AssignmentCardStats({ assignment }: { assignment: ClassroomAssignment }) {
  const summary = computeAssignmentSummary(assignment);
  if (summary.total === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <CardStatBadge icon={<CheckCircle2 size={12} />} label="Turned In" value={summary.completed} className="text-sage-green bg-sage-green/10" />
      <CardStatBadge icon={<Clock size={12} />} label="In Progress" value={summary.inProgress} className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30" />
      <CardStatBadge icon={<AlertCircle size={12} />} label="Not Started" value={summary.notStarted} className="text-slate-500 bg-slate-100 dark:bg-slate-800" />
      <CardStatBadge icon={<AlertCircle size={12} />} label="Late" value={summary.late} className="text-orange-600 bg-orange-50 dark:bg-orange-950/30" />
    </div>
  );
}

function CardStatBadge({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${className}`}>
      {icon} {value} {label}
    </span>
  );
}

function SummaryCard({ icon, label, value, total, color }: { icon: React.ReactNode; label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const bg: Record<string, string> = {
    green: 'bg-sage-green/10', blue: 'bg-blue-50 dark:bg-blue-950/30', slate: 'bg-slate-100 dark:bg-slate-800', orange: 'bg-orange-50 dark:bg-orange-950/30'
  };
  return (
    <div className={`p-5 rounded-3xl border border-slate-100 dark:border-slate-700 ${bg[color] || bg.slate}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</span></div>
      <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{value}<span className="text-lg text-slate-400">/{total}</span></p>
      <p className="text-xs font-bold text-slate-400 mt-1">{pct}% of class</p>
    </div>
  );
}

function StatusBadge({ status, isLate }: { status: string; isLate?: boolean }) {
  if (status === 'completed') {
    return <span className="text-xs font-black uppercase tracking-widest text-sage-green bg-sage-green/10 px-3 py-1 rounded-full">Turned In</span>;
  }
  if (status === 'in_progress') {
    return <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 rounded-full">In Progress</span>;
  }
  return (
    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${isLate ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
      {isLate ? 'Late — Not Started' : 'Not Started'}
    </span>
  );
}
