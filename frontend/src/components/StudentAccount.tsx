import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User, AtSign, Mail, GraduationCap, CalendarDays, BadgeCheck,
  Trash2, AlertTriangle, ShieldAlert, X
} from 'lucide-react';
import { StudentOverview } from '../types';

interface StudentAccountProps {
  overview: StudentOverview | null;
  loading: boolean;
  onDeleteStudent: () => Promise<void>;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function StudentAccount({ overview, loading, onDeleteStudent }: StudentAccountProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-soft-pink/30 border-t-soft-pink rounded-full animate-spin mb-6" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Loading student account...</p>
      </div>
    );
  }

  const student = overview?.studentProfile;

  if (!student) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Student Account</h1>
          <p className="text-xl text-slate-600 font-medium">Your linked student's account details.</p>
        </header>
        <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-xl text-center">
          <AlertTriangle size={36} className="text-soft-pink mx-auto mb-4" />
          <p className="font-black text-slate-700">No linked student account found.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onDeleteStudent();
      // On success, the parent is signed out and the app navigates away.
    } catch (err: any) {
      setError(err.message || 'Could not delete the account. Please try again.');
      setDeleting(false);
    }
  };

  const studentName = student.name || 'Student';
  const planLabel = student.isPaid ? 'Active Plan' : (student.path === 'district' ? 'District Access' : 'Free / Unpaid');

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Student Account</h1>
        <p className="text-xl text-slate-600 font-medium">
          Account details for <span className="font-black text-slate-900">{studentName}</span>.
        </p>
      </header>

      {/* Identity card */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-soft-pink to-sage-green px-10 py-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg">
            <span className="text-3xl font-black text-slate-900">
              {studentName.charAt(0).toUpperCase()}
            </span>
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
          <InfoRow icon={<GraduationCap size={18} />} label="Grade Level" value={student.grade ? `Grade ${student.grade}` : '—'} />
          <InfoRow icon={<CalendarDays size={18} />} label="Joined" value={formatDate(student.createdAt)} />
          <InfoRow icon={<BadgeCheck size={18} />} label="Plan Status" value={planLabel} />
        </div>
      </div>

      {/* Danger zone (parent-only control) */}
      <div className="bg-white rounded-[40px] border-2 border-red-100 shadow-xl shadow-red-100/30 overflow-hidden">
        <div className="flex items-center gap-3 px-10 py-6 border-b border-red-50 bg-red-50/40">
          <ShieldAlert size={22} className="text-red-500" />
          <h3 className="text-lg font-black text-red-600">Danger Zone</h3>
        </div>
        <div className="p-10">
          <h4 className="text-lg font-black text-slate-900 mb-2">Delete Student Account</h4>
          <p className="text-slate-500 font-medium leading-relaxed mb-6 max-w-2xl">
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

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white max-w-md w-full rounded-[40px] p-10 shadow-2xl relative"
          >
            <button
              onClick={() => !deleting && setShowConfirm(false)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-500"
            >
              <X size={22} />
            </button>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Are you absolutely sure?</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              This will permanently delete <span className="font-black text-slate-900">{studentName}'s</span> account
              and your parent account. To confirm, type <span className="font-black text-red-500">DELETE</span> below.
            </p>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold mb-4 flex items-center gap-2">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              disabled={deleting}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-red-300 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none transition-all mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <p className="text-sm font-black text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
