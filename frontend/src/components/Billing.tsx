import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, CheckCircle2, CalendarClock, RefreshCw, Sparkles, Info } from 'lucide-react';
import { UserProfile } from '../types';

interface BillingProps {
  profile?: UserProfile;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function Billing({ profile }: BillingProps) {
  const [autoRenew, setAutoRenew] = useState(true);

  const isPaid = !!profile?.isPaid;
  // Sample renewal date derived from account creation for placeholder display.
  const createdAt = profile?.createdAt ? new Date(profile.createdAt) : new Date();
  const baseDate = isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const renewalDate = addMonths(baseDate, 1);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Billing</h1>
        <p className="text-xl text-slate-600 font-medium">Manage your Valley Science subscription.</p>
      </header>

      {/* Preview banner */}
      <div className="flex items-start gap-3 p-5 bg-blue-50 border border-blue-100 rounded-3xl">
        <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm font-bold text-blue-700 leading-relaxed">
          This is a preview of your billing dashboard. Payments and renewals aren't active yet —
          you'll be able to manage real plan details here soon.
        </p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-soft-pink to-sage-green px-10 py-10 text-white relative overflow-hidden">
          <Sparkles size={120} className="absolute -right-6 -top-6 opacity-20" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80 mb-2">Current Plan</p>
          <h2 className="text-4xl font-black mb-1">{isPaid ? 'Valley Science Premium' : 'Free Plan'}</h2>
          <p className="text-white/90 font-bold flex items-center gap-2">
            {isPaid ? <CheckCircle2 size={18} /> : <CreditCard size={18} />}
            {isPaid ? 'Full access to all curriculum and Valerie' : 'Limited access — upgrade for full features'}
          </p>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <BillingStat
            icon={<CreditCard className="text-soft-pink" />}
            label="Status"
            value={isPaid ? 'Active' : 'Inactive'}
          />
          <BillingStat
            icon={<CalendarClock className="text-blue-500" />}
            label="Next Renewal"
            value={isPaid ? formatDate(renewalDate) : '—'}
          />
          <BillingStat
            icon={<RefreshCw className="text-sage-green" />}
            label="Auto-Renew"
            value={autoRenew ? 'On' : 'Off'}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renew */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black text-slate-900 mb-2">Renew Subscription</h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-6">
            {isPaid
              ? `Your plan is set to renew on ${formatDate(renewalDate)}. You can renew early at any time.`
              : 'Upgrade to Premium to unlock the full curriculum, simulations, and unlimited time with Valerie.'}
          </p>
          <button
            disabled
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black opacity-60 cursor-not-allowed transition-all"
          >
            {isPaid ? 'Renew Now' : 'Upgrade to Premium'}
          </button>
          <p className="text-[11px] font-bold text-slate-400 text-center mt-3">Coming soon</p>
        </div>

        {/* Auto-renew toggle */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black text-slate-900 mb-2">Auto-Renewal</h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-6">
            When enabled, your subscription renews automatically so your student never loses access.
          </p>
          <div className="flex items-center justify-between bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <div>
              <p className="font-black text-slate-900">Auto-renew my plan</p>
              <p className="text-xs font-bold text-slate-400">{autoRenew ? 'Enabled' : 'Disabled'}</p>
            </div>
            <button
              onClick={() => setAutoRenew(!autoRenew)}
              className={`relative w-16 h-9 rounded-full transition-colors ${autoRenew ? 'bg-sage-green' : 'bg-slate-300'}`}
              aria-label="Toggle auto-renew"
            >
              <motion.div
                layout
                className="absolute top-1 w-7 h-7 bg-white rounded-full shadow-md"
                animate={{ left: autoRenew ? 'calc(100% - 2rem)' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          <p className="text-[11px] font-bold text-slate-400 text-center mt-3">Preview only — not yet billed</p>
        </div>
      </div>
    </div>
  );
}

function BillingStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
      <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <p className="text-lg font-black text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
