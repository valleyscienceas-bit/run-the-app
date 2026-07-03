import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { ClassQuestionThread } from '../types';

interface TeacherQuestionsPanelProps {
  teacherUid?: string;
  onUnreadChange?: (count: number) => void;
}

export function TeacherQuestionsPanel({ teacherUid, onUnreadChange }: TeacherQuestionsPanelProps) {
  const [threads, setThreads] = useState<ClassQuestionThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!teacherUid) return;
    setLoading(true);
    try {
      const res = await fetch('/api/teacher-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load questions');
      setThreads(data.threads || []);
      setUnreadCount(data.unreadCount || 0);
      onUnreadChange?.(data.unreadCount || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [teacherUid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedId, threads]);

  const selected = threads.find(t => t.id === selectedId) || null;

  const openThread = async (thread: ClassQuestionThread) => {
    setSelectedId(thread.id);
    setReplyText('');
    if (thread.teacherUnreadCount > 0 && teacherUid) {
      await fetch('/api/teacher-mark-thread-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid, threadId: thread.id })
      }).catch(() => {});
      const newCount = Math.max(0, unreadCount - thread.teacherUnreadCount);
      setUnreadCount(newCount);
      onUnreadChange?.(newCount);
      setThreads(prev => prev.map(t =>
        t.id === thread.id ? { ...t, teacherUnreadCount: 0 } : t
      ));
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUid || !selectedId || !replyText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid, threadId: selectedId, text: replyText.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');
      setThreads(prev => prev.map(t => t.id === selectedId ? data.thread : t));
      setReplyText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const pendingThreads = threads.filter(t => t.teacherUnreadCount > 0 || t.status === 'open');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden" data-tour="teacher-questions">
      <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-soft-pink/10 dark:bg-soft-pink/15 rounded-2xl flex items-center justify-center">
            <MessageCircle size={24} className="text-soft-pink" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Student Questions</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {unreadCount > 0
                ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
                : pendingThreads.length > 0
                  ? `${pendingThreads.length} open thread${pendingThreads.length !== 1 ? 's' : ''}`
                  : 'No pending questions'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="self-start sm:self-center inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-red-500 text-white text-xs font-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] min-h-[320px]">
        <div className="border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 max-h-[360px] overflow-y-auto">
          {loading && threads.length === 0 ? (
            <p className="p-8 text-center font-bold text-slate-400">Loading...</p>
          ) : threads.length === 0 ? (
            <p className="p-8 text-center font-bold text-slate-400">No student questions yet.</p>
          ) : (
            <ul>
              {threads.map(t => {
                const lastMsg = t.messages[t.messages.length - 1];
                const isActive = selectedId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openThread(t)}
                      className={`w-full text-left px-6 py-4 border-b border-slate-50 dark:border-slate-800 transition-colors ${
                        isActive ? 'bg-soft-pink/10 dark:bg-soft-pink/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-900 dark:text-slate-100 truncate">{t.studentName}</p>
                        {t.teacherUnreadCount > 0 && (
                          <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                        {lastMsg?.text || 'No messages'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 mt-1">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ''}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col min-h-[280px]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <p className="font-bold text-slate-400">Select a question to view and reply.</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="font-black text-slate-900 dark:text-slate-100">{selected.studentName}</p>
                <button type="button" onClick={() => setSelectedId(null)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={18} />
                </button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[240px]">
                {selected.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'teacher' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium ${
                        m.role === 'teacher'
                          ? 'bg-sage-green/15 dark:bg-sage-green/20 text-slate-900 dark:text-slate-100 rounded-br-md'
                          : 'bg-soft-pink/10 dark:bg-soft-pink/15 text-slate-900 dark:text-slate-100 rounded-bl-md'
                      }`}
                    >
                      <p>{m.text}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {new Date(m.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleReply} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-4 py-3 font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400/60 outline-none text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="shrink-0 inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
