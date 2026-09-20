import { useState, useEffect, useRef } from 'react';
import { NGSSModule, ChatMessage, Lesson, Topic } from '../types';
import { Send, ArrowLeft, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db, doc, setDoc, onSnapshot } from '../lib/firebase';
import { ValerieMascot } from './ValerieMascot';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ICON_GHOST_BUTTON_CLASS } from '../lib/buttonStyles';
import { getSubmitErrorMessage, parseApiError } from '../utils/formSubmit';
import { authJsonHeaders, openSandboxLab } from '../lib/authHeaders';
import { renderChatMarkdown } from '../lib/chatMarkdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LEARNING_BANNER_KEY = 'vs-valerie-learning-banner-dismissed';

interface SocraticChatProps {
  selectedModule: NGSSModule | null;
  activeLesson?: Lesson | null;
  activeTopic?: Topic | null;
  topicComplete?: boolean;
  onCompleteTopic?: () => void;
  completingTopic?: boolean;
  onBack: () => void;
  /** Rich learning context for Valerie (grade, gaps, assignment, etc.) */
  studentContext?: string;
  onChatTopic?: (topic: string) => void;
}

export function SocraticChat({
  selectedModule,
  activeLesson,
  activeTopic,
  topicComplete,
  onCompleteTopic,
  completingTopic,
  onBack,
  studentContext,
  onChatTopic,
}: SocraticChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showLearningBanner, setShowLearningBanner] = useState(() => {
    try {
      return localStorage.getItem(LEARNING_BANNER_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Save time spent when leaving the chat
  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      const seconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (seconds < 5) return;
      auth.currentUser
        ?.getIdToken()
        .then((idToken) =>
          fetch('/api/track-time', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: userId, sessionSeconds: seconds }),
          })
        )
        .catch(() => {});
    };
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const labDone =
      !selectedModule?.sandboxHtml ||
      Boolean(studentContext?.includes('HAS completed the interactive lab'));

    const chatDoc = doc(db, 'chat_history', userId);
    const unsubscribe = onSnapshot(chatDoc, (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      } else {
        const initialMsg: ChatMessage = {
          role: 'model',
          text: activeTopic && selectedModule
            ? labDone
              ? `Hi! Let's explore "${activeTopic.title}" in ${selectedModule.title}. ${activeTopic.description || ''} What stood out to you so far — from the lab or from your own ideas?`
              : `Hi! Let's explore "${activeTopic.title}" in ${selectedModule.title}. ${activeTopic.description || ''} You can try the lab when you're ready, or tell me what you already wonder about this idea.`
            : selectedModule
            ? labDone
              ? `Hi! I'm Valerie. You're in "${selectedModule.title}." What did you notice, and what are you still figuring out?`
              : `Hi! I'm Valerie. You're starting "${selectedModule.title}." ${selectedModule.sandboxHtml ? 'When you try the lab, we can talk about what you see. For now — ' : ''}what do you already wonder about this topic?`
            : "Hi! I'm Valerie. I'm here to help you build mental models for science. What's on your mind today?",
          timestamp: new Date().toISOString()
        };
        setMessages([initialMsg]);
        setDoc(chatDoc, { userId, messages: [initialMsg], lastUpdated: new Date().toISOString() });
      }
    });

    return () => unsubscribe();
    // studentContext is only read for first greeting; avoid re-subscribing every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModule?.id, selectedModule?.sandboxHtml, activeTopic?.id, activeTopic?.title, activeTopic?.description]);

  useEffect(() => {
    if (activeTopic && onChatTopic) {
      onChatTopic(activeTopic.title);
    }
  }, [activeTopic?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const dismissLearningBanner = () => {
    setShowLearningBanner(false);
    try {
      localStorage.setItem(LEARNING_BANNER_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const sendMessage = async (
    messageText: string,
    historyMessages: ChatMessage[],
    attempt = 0
  ) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setSendError('You need to be signed in to chat with Valerie.');
      return;
    }

    setIsLoading(true);
    if (attempt === 0) {
      setSendError(null);
      setFailedMessage(null);
      onChatTopic?.(messageText.slice(0, 120));
    }

    try {
      const moduleContext = selectedModule
        ? [
            `Module: ${selectedModule.title} (${selectedModule.code}).`,
            `About: ${selectedModule.description}.`,
            `Gap to repair: ${selectedModule.gap}.`,
            selectedModule.ahHaGoal ? `Target ah-ha: ${selectedModule.ahHaGoal}.` : '',
            selectedModule.sandboxHtml
              ? (studentContext?.includes('HAS completed the interactive lab')
                  ? 'Lab status: COMPLETED for this module — ask about observations from THIS lab only.'
                  : 'Lab status: NOT completed — do NOT ask what happened in a lab yet; invite them to try it or discuss the topic conceptually.')
              : 'No interactive lab for this module.',
            activeLesson && activeTopic
              ? `Current lesson: ${activeLesson.title}. Current topic: ${activeTopic.title}. ${activeTopic.description || ''}`
              : 'No lesson/topic selected yet — keep questions open and do not invent prior work.',
          ]
            .filter(Boolean)
            .join('\n')
        : 'No module selected. Open-ended science chat. Do NOT invent a specific lab or prior experiment.';

      const headers = await authJsonHeaders(attempt > 0);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          history: historyMessages.map(m => ({ role: m.role, text: m.text })),
          message: messageText,
          moduleContext,
          studentContext,
        })
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Valerie is temporarily unavailable. Please try again.'));
      }

      const data = await res.json();
      const responseText = data.response || "Oops! My circuits are a bit tangled. Can you try saying that again?";

      const modelMessage: ChatMessage = {
        role: 'model',
        text: responseText,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [
        ...historyMessages,
        { role: 'user' as const, text: messageText, timestamp: new Date().toISOString() },
        modelMessage,
      ];

      setMessages(finalMessages);

      await setDoc(doc(db, 'chat_history', userId), {
        userId,
        messages: finalMessages,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      if (attempt === 0) {
        return sendMessage(messageText, historyMessages, 1);
      }
      console.error('Chat error:', error);
      setFailedMessage(messageText);
      setSendError(
        getSubmitErrorMessage(error).includes('backend is running')
          ? 'Valerie is temporarily unavailable. Check your connection and try again.'
          : getSubmitErrorMessage(error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    const userMessage: ChatMessage = {
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    const historyBeforeSend = messages;
    setMessages([...messages, userMessage]);
    setInput('');
    await sendMessage(messageText, historyBeforeSend);
  };

  const handleRetry = async () => {
    if (!failedMessage || isLoading) return;
    // Keep the user bubble; only retry the API call
    const historyBeforeSend = messages.filter(
      (m, i) => !(i === messages.length - 1 && m.role === 'user' && m.text === failedMessage)
    );
    // Ensure user message is visible
    const lastIsFailedUser =
      messages[messages.length - 1]?.role === 'user' &&
      messages[messages.length - 1]?.text === failedMessage;
    if (!lastIsFailedUser) {
      setMessages([
        ...historyBeforeSend,
        { role: 'user', text: failedMessage, timestamp: new Date().toISOString() },
      ]);
    }
    await sendMessage(failedMessage, historyBeforeSend);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-soft-pink dark:bg-rose-900/60 p-6 flex items-center justify-between" data-tour="chat-header">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            data-tour="chat-back"
            className={cn(ICON_GHOST_BUTTON_CLASS, 'text-slate-800 dark:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-800/50')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ValerieMascot size={40} className="bg-white dark:bg-slate-800 rounded-full p-1" />
            <div>
              <h2 className="font-black text-slate-900 dark:text-slate-100 leading-none">Valerie</h2>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mt-1">Socratic Mentor</p>
            </div>
          </div>
        </div>
        {selectedModule && (
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="px-4 py-1.5 bg-white/20 dark:bg-slate-800/50 rounded-full text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              {selectedModule.code}
            </div>
            {activeTopic && (
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                {activeTopic.title}
              </p>
            )}
          </div>
        )}
      </div>

      {showLearningBanner && (
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Valerie remembers what you’ve been working on and changes her questions to fit you — like a tutor getting to know a student. The same Valerie helps everyone; she just uses your progress notes so her questions match you.
          </p>
          <button
            type="button"
            onClick={dismissLearningBanner}
            className={cn(ICON_GHOST_BUTTON_CLASS, 'shrink-0')}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {selectedModule?.sandboxHtml && (
        <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Lab available — reopen anytime for observations
          </p>
          <button
            type="button"
            onClick={() => selectedModule.sandboxHtml && openSandboxLab(selectedModule.sandboxHtml)}
            className="text-[10px] font-black uppercase tracking-widest text-soft-pink"
          >
            Open lab
          </button>
        </div>
      )}

      {activeTopic && onCompleteTopic && !topicComplete && messages.some((m) => m.role === 'user') && (
        <div className="px-6 py-3 bg-sage-green/10 dark:bg-sage-green/10 border-b border-sage-green/20 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            After chatting with Valerie about <span className="font-black">{activeTopic.title}</span>, mark it complete to unlock the next step.
          </p>
          <button
            type="button"
            onClick={onCompleteTopic}
            disabled={completingTopic}
            className="inline-flex items-center gap-2 bg-sage-green text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <CheckCircle2 size={14} />
            {completingTopic ? 'Saving…' : 'Mark topic complete'}
          </button>
        </div>
      )}

      {activeTopic && onCompleteTopic && !topicComplete && !messages.some((m) => m.role === 'user') && (
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
          Chat with Valerie about this topic before you can mark it complete.
        </div>
      )}

      {activeTopic && topicComplete && (
        <div className="px-6 py-3 bg-sage-green/15 border-b border-sage-green/20 text-sm font-black text-sage-green">
          Topic complete — return to the module to continue your path.
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollRef}
        data-tour="chat-messages"
        className="flex-1 overflow-y-auto p-8 space-y-6 bg-cream/20 dark:bg-slate-950/50"
      >
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[80%] p-6 rounded-[32px] font-medium leading-relaxed shadow-sm",
              msg.role === 'user' 
                ? "bg-slate-900 dark:bg-slate-700 text-white rounded-tr-none whitespace-pre-wrap" 
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none"
            )}>
              {msg.role === 'model' ? renderChatMarkdown(msg.text) : msg.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-[32px] rounded-tl-none">
              <div className="flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-soft-pink rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-soft-pink rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-soft-pink rounded-full" />
              </div>
            </div>
          </div>
        )}
        {sendError && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[90%] bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-orange-800 dark:text-orange-200 p-5 rounded-[28px] rounded-tl-none">
              <p className="font-bold text-sm mb-3">{sendError}</p>
              {failedMessage && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
                >
                  <RefreshCw size={14} /> Retry message
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800" data-tour="chat-input">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }}
            placeholder="Ask Valerie a question..."
            className="w-full pl-6 pr-16 py-5 bg-cream dark:bg-slate-800 rounded-3xl border-2 border-transparent focus:border-soft-pink outline-none font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400/60 transition-all"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
