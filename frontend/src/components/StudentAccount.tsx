import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User, AtSign, Mail, GraduationCap, CalendarDays, BadgeCheck,
  Trash2, AlertTriangle, ShieldAlert, X, Plus, ChevronDown
} from 'lucide-react';
import { StudentOverview, GradeLevel } from '../types';
import { FormError } from './FormError';
import { CANCEL_BUTTON_CLASS } from '../lib/buttonStyles';
import { INPUT_CLASS_PX } from '../lib/formStyles';

interface StudentAccountProps {
  overview: StudentOverview | null;
  loading: boolean;
  parentUid: string;
  readOnly?: boolean;
  onDeleteStudent: () => Promise<void>;
  onSwitchStudent: (studentUid: string) => void;
  onAddStudent: (data: { name: string; username: string; email: string; password: string; grade: GradeLevel }) => Promise<void>;
  onGradeChange: (studentUid: string, newGrade: GradeLevel) => Promise<void>;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function StudentAccount({
  overview, loading, parentUid, readOnly = false, onDeleteStudent, onSwitchStudent, onAddStudent, onGradeChange
}: StudentAccountProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', username: '', email: '', password: '', grade: '6' as GradeLevel });
  const [adding, setAdding] = useState(false);
  const [gradeWarning, setGradeWarning] = useState<{ open: boolean; newGrade: GradeLevel | null }>({ open: false, newGrade: null });

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-soft-pink/30 border-t-soft-pink rounded-full animate-spin mb-6" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Loading student account...</p>
      </div>
    );
  }

  const student = overview?.studentProfile;
  const linkedStudents = overview?.linkedStudents || [];

  if (!student) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Student Account</h1>
          <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">Your linked student's account details.</p>
        </header>
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-black/20 text-center">
          <AlertTriangle size={36} className="text-soft-pink mx-auto mb-4" />
          <p className="font-black text-slate-700 dark:text-slate-300">No linked student account found.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onDeleteStudent();
    } catch (err: any) {
      setError(err.message || 'Could not delete the account. Please try again.');
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 400);
      setDeleting(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await onAddStudent(addForm);
      setShowAddForm(false);
      setAddForm({ name: '', username: '', email: '', password: '', grade: '6' });
    } catch (err: any) {
      setError(err.message);
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 400);
    } finally {
      setAdding(false);
    }
  };

  const handleGradeChange = async (newGrade: GradeLevel) => {
    setSavingGrade(true);
    setError(null);
    try {
      await onGradeChange(student.uid, newGrade);
      setGradeWarning({ open: false, newGrade: null });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  const requestGradeChange = (newGrade: GradeLevel) => {
    if (newGrade === student.grade) return;
    setGradeWarning({ open: true, newGrade });
  };

  const studentName = student.name || 'Student';
  const planLabel = student.isPaid ? 'Active Plan' : (student.path === 'district' ? 'District Access' : 'Free / Unpaid');

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Student Account</h1>
          <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">
            Account details for <span className="font-black text-slate-900 dark:text-slate-100">{studentName}</span>.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-4 rounded-2xl font-black hover:opacity-90 transition-all"
          >
            <Plus size={18} /> Add Another Student
          </button>
        )}
      </header>

      {linkedStudents.length > 1 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg dark:shadow-black/20">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Switch Student</label>
          <div className="relative">
            <select
              value={overview?.activeStudentUid || student.uid}
              onChange={e => onSwitchStudent(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-5 py-4 font-bold text-slate-900 dark:text-slate-100 outline-none pr-10"
            >
              {linkedStudents.map(s => (
                <option key={s.uid} value={s.uid}>{s.name} (Grade {s.grade})</option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      <FormError message={error} shake={errorShake} />

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">
        <div className="bg-gradient-to-r from-soft-pink to-sage-green px-10 py-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-lg">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">{studentName}</h2>
            <p className="text-white/80 font-bold flex items-center gap-2 mt-1">
              <BadgeCheck size={16} /> {planLabel}
            </p>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoRow icon={<User size={18} />} label="Full Name" value={student.name || '—'} />
          <InfoRow icon={<AtSign size={18} />} label="Username" value={student.username || '—'} />
          <InfoRow icon={<Mail size={18} />} label="Email" value={student.email || '—'} />
          <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grade Level</p>
              <select
                data-tour="parent-grade-select"
                value={student.grade || '6'}
                disabled={savingGrade || readOnly}
                onChange={e => requestGradeChange(e.target.value as GradeLevel)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-black text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-soft-pink disabled:opacity-50"
              >
                {['3','4','5','6','7','8'].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
          </div>
          <InfoRow icon={<CalendarDays size={18} />} label="Joined" value={formatDate(student.createdAt)} />
          <InfoRow icon={<BadgeCheck size={18} />} label="Plan Status" value={planLabel} />
        </div>
      </div>

      {!readOnly && (
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border-2 border-red-100 dark:border-red-900/50 shadow-xl shadow-red-100/30 dark:shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-3 px-10 py-6 border-b border-red-50 dark:border-red-900/30 bg-red-50/40 dark:bg-red-950/30">
          <ShieldAlert size={22} className="text-red-500" />
          <h3 className="text-lg font-black text-red-600 dark:text-red-400">Danger Zone</h3>
        </div>
        <div className="p-10">
          <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">Delete Student Account</h4>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 max-w-2xl">
            Permanently deletes {studentName}'s account, all progress, test results, and learning history.
            This also removes your linked parent account. This action cannot be undone.
          </p>
          <button
            onClick={() => { setShowConfirm(true); setConfirmText(''); setError(null); }}
            className="inline-flex items-center gap-2 bg-red-500 text-white px-7 py-4 rounded-2xl font-black hover:bg-red-600 transition-all"
          >
            <Trash2 size={18} /> Delete Student Account
          </button>
        </div>
      </div>
      )}

      {!readOnly && showAddForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 max-w-md w-full rounded-[40px] p-10 shadow-2xl relative border border-slate-100 dark:border-slate-700">
            <button onClick={() => !adding && setShowAddForm(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300"><X size={22} /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-6">Add Another Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <AddInput label="Full Name" value={addForm.name} onChange={v => setAddForm({ ...addForm, name: v })} required />
              <AddInput label="Username" value={addForm.username} onChange={v => setAddForm({ ...addForm, username: v })} />
              <AddInput label="Email" type="email" value={addForm.email} onChange={v => setAddForm({ ...addForm, email: v })} required />
              <AddInput label="Password" type="password" value={addForm.password} onChange={v => setAddForm({ ...addForm, password: v })} required />
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Grade</label>
                <select value={addForm.grade} onChange={e => setAddForm({ ...addForm, grade: e.target.value as GradeLevel })}
                  className={`${INPUT_CLASS_PX}`}>
                  {['3','4','5','6','7','8'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <button type="submit" disabled={adding} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-2xl font-black disabled:opacity-50 hover:opacity-90 transition-all">
                {adding ? 'Creating...' : 'Create Student Account'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {gradeWarning.open && gradeWarning.newGrade && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 max-w-md w-full rounded-[40px] p-10 shadow-2xl relative border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => !savingGrade && setGradeWarning({ open: false, newGrade: null })}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X size={22} />
            </button>
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-orange-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3">Change grade level?</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-4">
              You are changing {studentName} from <span className="font-black">Grade {student.grade}</span> to{' '}
              <span className="font-black">Grade {gradeWarning.newGrade}</span>.
            </p>
            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-2xl mb-6">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                {studentName} will <span className="font-black text-orange-600 dark:text-orange-400">not be able to access Grade {student.grade} curriculum</span> until you change the grade level back. Their test scores and module progress for Grade {student.grade} are saved and will not be deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setGradeWarning({ open: false, newGrade: null })}
                disabled={savingGrade}
                className={CANCEL_BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                onClick={() => handleGradeChange(gradeWarning.newGrade!)}
                disabled={savingGrade}
                className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-2xl font-black disabled:opacity-50 hover:opacity-90 transition-all"
              >
                {savingGrade ? 'Saving...' : 'Confirm Change'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 max-w-md w-full rounded-[40px] p-10 shadow-2xl relative border border-slate-100 dark:border-slate-700">
            <button onClick={() => !deleting && setShowConfirm(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300"><X size={22} /></button>
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3">Are you absolutely sure?</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
              This will permanently delete <span className="font-black text-slate-900 dark:text-slate-100">{studentName}'s</span> account
              and your parent account. Type <span className="font-black text-red-500">DELETE</span> to confirm.
            </p>
            <FormError message={error} shake={errorShake} />
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type DELETE" disabled={deleting}
              className={`${INPUT_CLASS_PX} focus:border-red-300 dark:focus:border-red-500 mb-6`} />
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={deleting} className={CANCEL_BUTTON_CLASS}>Cancel</button>
              <button onClick={handleDelete} disabled={confirmText !== 'DELETE' || deleting} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black disabled:opacity-40">
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{value}</p>
      </div>
    </div>
  );
}

function AddInput({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)}
        className={INPUT_CLASS_PX} />
    </div>
  );
}
