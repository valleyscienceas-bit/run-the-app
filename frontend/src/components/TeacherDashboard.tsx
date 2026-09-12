import React, { useState } from 'react';
import { useProgressRefresh } from '../lib/useProgressRefresh';
import { ChevronLeft, Eye, EyeOff, KeyRound, RefreshCw, ChevronRight, Download, Upload } from 'lucide-react';
import { StudentOverview } from '../types';
import { ParentDashboard } from './ParentDashboard';
import { TeacherQuestionsPanel } from './TeacherQuestionsPanel';
import { AchievementPointsDisplay, sumClassPoints } from './AchievementPointsDisplay';
import { reconcileTotalPoints } from '../lib/points';
import { BACK_LINK_CLASS, GHOST_BUTTON_CLASS } from '../lib/buttonStyles';
import { formatLearningTime } from '../lib/learningStats';
import { computeOpenAndClosedGaps } from '../lib/learningContext';
import { parseRosterCsv } from '../lib/rosterCsv';
import { LinkParentCard } from './LinkParentCard';

interface TeacherDashboardProps {
  students: StudentOverview[];
  teacherUid?: string;
  classroomId?: string;
  onSelectStudent: (uid: string) => void;
  selectedOverview: StudentOverview | null;
  onRefresh: () => void;
  onNotificationsChange?: (count: number) => void;
}

export function TeacherDashboard({
  students, teacherUid, classroomId, onSelectStudent, selectedOverview, onRefresh, onNotificationsChange
}: TeacherDashboardProps) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [passwordDraft, setPasswordDraft] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Class table auto-refresh; student detail view uses ParentDashboard's hook instead
  useProgressRefresh(() => {
    if (!selectedOverview?.studentProfile) onRefresh();
  });

  const togglePassword = (uid: string) => {
    setShowPasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const exportClassCsv = () => {
    const header = [
      'Name', 'Email', 'Username', 'Grade', 'Parent Name', 'Parent Email', 'Tests', 'Avg Score', 'Best Score',
      'Points', 'Time Learning (seconds)', 'Time Learning', 'Open Gaps', 'Open Gap List', 'Last Active',
    ];
    const rows = students.map(s => {
      const profile = s.studentProfile;
      if (!profile) return null;
      const scores = s.results.map(r => r.score);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '';
      const best = scores.length ? Math.round(Math.max(...scores)) : '';
      const openGaps = s.results.length
        ? computeOpenAndClosedGaps(s.results).openGaps
        : [];
      const lastTs = s.results.length
        ? s.results[s.results.length - 1].timestamp
        : s.stats?.lastUpdated;
      const secs = s.stats?.totalSeconds || 0;
      const points = reconcileTotalPoints(profile.totalPoints, profile.earnedAchievements);
      return [
        profile.name,
        profile.email,
        profile.username,
        profile.grade || '',
        s.linkedParent?.name || '',
        s.linkedParent?.email || profile.parentEmail || '',
        s.results.length,
        avg,
        best,
        points,
        secs,
        formatLearningTime(secs),
        openGaps.length,
        openGaps.join('; '),
        lastTs ? new Date(lastTs).toISOString() : '',
      ].map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',');
    }).filter(Boolean);

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valley-science-class-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (file: File) => {
    if (!teacherUid || !classroomId) {
      setMessage('Select a classroom before importing a roster.');
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const rows = parseRosterCsv(text);
      if (rows.length === 0) throw new Error('CSV must include Name and Email columns with at least one data row.');

      const res = await fetch('/api/sync-class-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId, teacherUid, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      const added = data.added?.length || 0;
      const linked = data.linked?.length || 0;
      const parents = data.parentsProvisioned?.length || 0;
      const errCount = data.errors?.length || 0;
      setMessage(
        `Roster import complete: ${added} added, ${linked} already in class` +
        (parents ? `, ${parents} parent(s) linked` : '') +
        (errCount ? `, ${errCount} error(s).` : '.')
      );
      onRefresh();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetPassword = async (studentUid: string) => {
    if (!teacherUid) return;
    setResetting(studentUid);
    setMessage(null);
    try {
      const newPwd = passwordDraft[studentUid]?.trim() || undefined;
      const res = await fetch('/api/teacher-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid, studentUid, newPassword: newPwd })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setMessage(`Password updated for student.`);
      onRefresh();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setResetting(null);
    }
  };

  if (selectedOverview?.studentProfile) {
    const uid = selectedOverview.studentProfile.uid;
    const pwd = selectedOverview.studentProfile.demoPassword || 'Sandbox123!';

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button
          onClick={() => onSelectStudent('')}
          className={BACK_LINK_CLASS}
        >
          <ChevronLeft size={16} /> Back to class table
        </button>

        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <KeyRound size={20} className="text-soft-pink" /> Account Access
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
              <p className="font-bold text-slate-900 dark:text-slate-100">{selectedOverview.studentProfile.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{selectedOverview.studentProfile.email}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Current Password</p>
              <div className="flex items-center gap-2">
                <code className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {showPasswords[uid] ? pwd : '••••••••••'}
                </code>
                <button type="button" onClick={() => togglePassword(uid)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPasswords[uid] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="New password (optional — defaults to Sandbox123!)"
              value={passwordDraft[uid] || ''}
              onChange={e => setPasswordDraft(prev => ({ ...prev, [uid]: e.target.value }))}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-4 py-3 font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400/60 outline-none"
            />
            <button
              onClick={() => handleResetPassword(uid)}
              disabled={resetting === uid}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black disabled:opacity-50"
            >
              <RefreshCw size={16} className={resetting === uid ? 'animate-spin' : ''} />
              {resetting === uid ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          {message && <p className="mt-3 text-sm font-bold text-sage-green">{message}</p>}
        </div>

        <LinkParentCard
          studentUid={uid}
          studentName={selectedOverview.studentProfile.name}
          studentGrade={selectedOverview.studentProfile.grade}
          districtId={selectedOverview.studentProfile.districtId}
          linkedParent={selectedOverview.linkedParent}
          requesterUid={teacherUid || ''}
          requesterRole="teacher"
          onLinked={onRefresh}
          description="Link one parent or guardian for this student. If the student already linked a parent in their settings, it appears here too."
        />

        <ParentDashboard
          overview={selectedOverview}
          loading={false}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">My Class</h1>
          <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">
            {students.length} student{students.length !== 1 ? 's' : ''} — click a row for full progress & password controls.
          </p>
          {students.length > 0 && (
            <AchievementPointsDisplay
              totalPoints={sumClassPoints(students)}
              earnedAchievements={[]}
              className="mt-3"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3 self-start">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleImportCsv(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || !classroomId}
            data-tour="teacher-import-csv"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-5 py-3 rounded-2xl font-black text-sm hover:border-soft-pink disabled:opacity-40 transition-all"
          >
            <Upload size={16} /> {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            type="button"
            onClick={exportClassCsv}
            disabled={students.length === 0}
            data-tour="teacher-export-csv"
            className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={onRefresh}
            className={`${GHOST_BUTTON_CLASS}`}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      {message && !selectedOverview && (
        <div className="p-4 bg-sage-green/10 border border-sage-green/20 rounded-2xl text-sage-green text-sm font-bold">{message}</div>
      )}

      <TeacherQuestionsPanel
        teacherUid={teacherUid}
        onUnreadChange={(count) => onNotificationsChange?.(count)}
      />

      {students.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-slate-100 dark:border-slate-800 text-center">
          <p className="font-black text-slate-500 dark:text-slate-400">No students in this class yet. Use the district sandbox to preview a full roster.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden" data-tour="teacher-class-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  {['Student', 'Grade', 'Parent', 'Username', 'Password', 'Avg Score', 'Tests', 'Points', 'Time', 'Open Gaps', 'Last Active', ''].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const profile = s.studentProfile;
                  if (!profile) return null;
                  const uid = profile.uid;
                  const avg = s.results.length
                    ? Math.round(s.results.reduce((sum, r) => sum + r.score, 0) / s.results.length)
                    : null;
                  const gaps = s.results.length
                    ? computeOpenAndClosedGaps(s.results).openGaps.length
                    : 0;
                  const lastTs = s.results.length
                    ? s.results[s.results.length - 1].timestamp
                    : s.stats?.lastUpdated;
                  const pwd = profile.demoPassword || 'Sandbox123!';

                  return (
                    <tr
                      key={uid}
                      className="border-b border-slate-50 dark:border-slate-800 hover:bg-soft-pink/5 dark:hover:bg-soft-pink/10 transition-colors cursor-pointer group"
                      onClick={() => onSelectStudent(uid)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-900 dark:text-slate-100">{profile.name}</p>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-[140px]">{profile.email}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">G{profile.grade}</td>
                      <td className="px-5 py-4 text-sm" onClick={e => e.stopPropagation()}>
                        {s.linkedParent?.email ? (
                          <div>
                            <p className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                              {s.linkedParent.name || 'Parent'}
                            </p>
                            <p className="text-xs text-slate-400 font-medium truncate max-w-[140px]">{s.linkedParent.email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-bold">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-600 dark:text-slate-400 text-sm">{profile.username}</td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                            {showPasswords[uid] ? pwd : '••••••••'}
                          </code>
                          <button type="button" onClick={() => togglePassword(uid)} className="p-1 text-slate-400 hover:text-slate-600">
                            {showPasswords[uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-black ${avg !== null && avg >= 70 ? 'text-sage-green' : avg !== null ? 'text-orange-500' : 'text-slate-400'}`}>
                          {avg !== null ? `${avg}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">{s.results.length}</td>
                      <td className="px-5 py-4 font-bold text-amber-800 dark:text-amber-300">
                        {reconcileTotalPoints(profile.totalPoints, profile.earnedAchievements) || '—'}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">{formatLearningTime(s.stats?.totalSeconds || 0)}</td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">{gaps}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-400">
                        {lastTs ? new Date(lastTs).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-soft-pink transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

