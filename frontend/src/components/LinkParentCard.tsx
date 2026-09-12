import React, { useState } from 'react';
import { UserCircle, Link2, Mail } from 'lucide-react';
import { INPUT_CLASS_PX } from '../lib/formStyles';

export type LinkedParentInfo = {
  uid?: string;
  name?: string;
  email?: string;
};

interface LinkParentCardProps {
  studentUid: string;
  studentName?: string;
  studentGrade?: string;
  districtId?: string;
  linkedParent?: LinkedParentInfo | null;
  requesterUid: string;
  requesterRole: 'student' | 'teacher';
  onLinked: () => void;
  title?: string;
  description?: string;
}

export function LinkParentCard({
  studentUid,
  studentName,
  studentGrade,
  districtId,
  linkedParent,
  requesterUid,
  requesterRole,
  onLinked,
  title = 'Linked Parent',
  description = 'Each student can have one parent account for progress monitoring. The parent signs in under District Partnership → Parent.',
}: LinkParentCardProps) {
  const [parentEmail, setParentEmail] = useState(linkedParent?.email || '');
  const [parentName, setParentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/link-district-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUid,
          parentEmail: parentEmail.trim(),
          parentName: parentName.trim() || undefined,
          requesterUid,
          requesterRole,
          studentName,
          studentGrade,
          districtId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link parent');

      setMessage({
        type: 'success',
        text: linkedParent?.email
          ? 'Parent account updated. A welcome email was sent if this is a new parent.'
          : 'Parent linked. They can sign in at District Partnership → Parent with this email.',
      });
      onLinked();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to link parent',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 text-soft-pink font-black text-xs uppercase tracking-widest mb-4">
        <UserCircle size={20} />
        {title}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">{description}</p>

      {linkedParent?.email && (
        <div className="mb-6 p-4 rounded-2xl bg-sage-green/10 dark:bg-sage-green/15 border border-sage-green/20 dark:border-sage-green/30">
          <p className="text-[10px] font-black text-sage-green uppercase tracking-widest mb-1">Current parent</p>
          <p className="font-black text-slate-900 dark:text-slate-100">{linkedParent.name || 'Parent'}</p>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-1">
            <Mail size={14} /> {linkedParent.email}
          </p>
        </div>
      )}

      {message && (
        <div
          className={`mb-4 p-4 rounded-2xl text-sm font-bold ${
            message.type === 'success'
              ? 'bg-sage-green/10 text-sage-green border border-sage-green/20'
              : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Parent email
          </label>
          <input
            type="email"
            required
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            className={INPUT_CLASS_PX}
            disabled={loading}
          />
        </div>
        {!linkedParent?.email && (
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Parent name (optional)
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Jane Doe"
              className={INPUT_CLASS_PX}
              disabled={loading}
            />
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !parentEmail.trim()}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black disabled:opacity-50 hover:opacity-90 transition-all"
        >
          <Link2 size={16} />
          {loading ? 'Linking...' : linkedParent?.email ? 'Update parent' : 'Link parent'}
        </button>
      </form>
    </div>
  );
}
