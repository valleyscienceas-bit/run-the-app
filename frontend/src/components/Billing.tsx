import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, CheckCircle2, CalendarClock, RefreshCw, Sparkles, Info, UserCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface BillingProps {
  profile?: UserProfile;
  linkedStudents?: Pick<UserProfile, 'uid' | 'name' | 'grade' | 'isPaid'>[];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function Billing({ profile, linkedStudents = [] }: BillingProps) {
  const [autoRenew, setAutoRenew] = useState<Record<string, boolean>>({});

  const students = linkedStudents.length > 0
    ? linkedStudents
    : profile?.linkedStudentUid
      ? [{ uid: profile.linkedStudentUid, name: 'Linked Student', grade: profile.grade, isPaid: profile.isPaid }]
      : [];

  const createdAt = profile?.createdAt ? new Date(profile.createdAt) : new Date();
  const baseDate = isNaN(createdAt.getTime()) ? new Date() : createdAt;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Billing</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
          One subscription per student — $8/month or $90/year each.
        </p>
      </header>

      <div className="flex items-start gap-3 p-5 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-3xl">
        <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
          This is a preview of your billing dashboard. Payments and renewals aren't active yet —
          you'll manage a separate plan for each child here when billing goes live.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl text-center">
          <UserCircle size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">No student accounts yet</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Add a student under Student Account to see their billing here.</p>
        </div>
      ) : (
        <div className="space-y-8" data-tour="parent-billing-cards">
          {students.map((student) => {
            const isPaid = !!student.isPaid;
            const renewalDate = addMonths(baseDate, 1);
            const renewOn = autoRenew[student.uid] ?? true;
            return (
              <div key={student.uid} className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">
                <div className="bg-gradient-to-r from-soft-pink to-sage-green px-8 py-8 text-white relative overflow-hidden">
                  <Sparkles size={80} className="absolute -right-4 -top-4 opacity-20" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80 mb-1">{student.name} · Grade {student.grade || '—'}</p>
                  <h2 className="text-3xl font-black mb-1">{isPaid ? 'Valley Science Premium' : 'Free Plan'}</h2>
                  <p className="text-white/90 font-bold flex items-center gap-2 text-sm">
                    {isPaid ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}
                    {isPaid ? 'Full curriculum & Valerie access' : 'Limited access — upgrade for this student'}
                  </p>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BillingStat icon={<CreditCard className="text-soft-pink" />} label="Status" value={isPaid ? 'Active' : 'Inactive'} />
                  <BillingStat icon={<CalendarClock className="text-blue-500" />} label="Next Renewal" value={isPaid ? formatDate(renewalDate) : '—'} />
                  <BillingStat icon={<RefreshCw className="text-sage-green" />} label="Auto-Renew" value={renewOn ? 'On' : 'Off'} />
                </div>

                <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 mb-2">
                      {isPaid ? 'Renew' : 'Upgrade'} — {student.name.split(' ')[0]}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">
                      {isPaid
                        ? `Renews ${formatDate(renewalDate)} · $8/mo or $90/yr for this student only.`
                        : 'Unlock full curriculum and unlimited Valerie for this child.'}
                    </p>
                    <button disabled className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black opacity-60 cursor-not-allowed">
                      {isPaid ? 'Renew Now' : 'Upgrade to Premium'}
                    </button>
                    <p className="text-[11px] font-bold text-slate-400 text-center mt-2">Coming soon</p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 dark:text-slate-100">Auto-renew</p>
                      <p className="text-xs font-bold text-slate-400">{renewOn ? 'Enabled' : 'Disabled'} for {student.name.split(' ')[0]}</p>
                    </div>
                    <button
                      onClick={() => setAutoRenew(prev => ({ ...prev, [student.uid]: !renewOn }))}
                      className={`relative w-14 h-8 rounded-full transition-colors ${renewOn ? 'bg-sage-green' : 'bg-slate-300 dark:bg-slate-600'}`}
                      aria-label={`Toggle auto-renew for ${student.name}`}
                    >
                      <motion.div
                        layout
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                        animate={{ left: renewOn ? 'calc(100% - 1.75rem)' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BillingStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
      <div className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <p className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">{value}</p>
      </div>
    </div>
  );
}
