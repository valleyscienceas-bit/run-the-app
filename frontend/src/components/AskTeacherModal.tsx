import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { ClassQuestionThread } from '../types';
import { CANCEL_BUTTON_CLASS } from '../lib/buttonStyles';

interface AskTeacherModalProps {
  studentUid?: string;
  open: boolean;
  onClose: () => void;
  onThreadRead?: () => void;
}

export function AskTeacherModal({ studentUid, open, onClose, onThreadRead }: AskTeacherModalProps) {
  const [thread, setThread] = useState<ClassQuestionThread | null>(null);
  const [classroomName, setClassroomName] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThread = async () => {
    if (!studentUid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student-teacher-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentUid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversation');
      setThread(data.thread);
      setClassroomName(data.classroomName || '');
      if (data.thread) onThreadRead?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && studentUid) loadThread();
  }, [open, studentUid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUid || !input.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/student-ask-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentUid, text: input.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send question');
      setThread(data.thread);
      setInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-soft-pink/10 dark:bg-soft-pink/15 rounded-2xl flex items-center justify-center">
              <MessageCircle size={24} className="text-soft-pink" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Ask Your Teacher</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {classroomName ? `${classroomName} — ` : ''}Private message to your teacher
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold">
            {error}
          </div>
        )}

        <div ref={scrollRef} className="p-6 space-y-4 min-h-[200px] max-h-[320px] overflow-y-auto">
          {loading ? (
            <p className="text-center font-bold text-slate-400 py-8">Loading...</p>
          ) : !thread || thread.messages.length === 0 ? (
            <p className="text-center font-bold text-slate-400 py-8">
              No messages yet. Ask your teacher anything about class!
            </p>
          ) : (
            thread.messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium ${
                    m.role === 'student'
                      ? 'bg-soft-pink/15 dark:bg-soft-pink/20 text-slate-900 dark:text-slate-100 rounded-br-md'
                      : 'bg-sage-green/15 dark:bg-sage-green/20 text-slate-900 dark:text-slate-100 rounded-bl-md'
                  }`}
                >
                  <p>{m.text}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {new Date(m.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-4 py-3 font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400/60 outline-none text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>

        <div className="px-6 pb-6">
          <button type="button" onClick={onClose} className={`${CANCEL_BUTTON_CLASS} w-full`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
