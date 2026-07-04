import { useState, useEffect, useRef } from 'react';
import { NGSSModule, ChatMessage } from '../types';
import { Send, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db, doc, setDoc, onSnapshot } from '../lib/firebase';
import { ValerieMascot } from './ValerieMascot';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ICON_GHOST_BUTTON_CLASS } from '../lib/buttonStyles';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SocraticChatProps {
  selectedModule: NGSSModule | null;
  onBack: () => void;
}

export function SocraticChat({ selectedModule, onBack }: SocraticChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      fetch('/api/track-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, sessionSeconds: seconds })
      }).catch(() => {});
    };
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatDoc = doc(db, 'chat_history', userId);
    const unsubscribe = onSnapshot(chatDoc, (doc) => {
      if (doc.exists()) {
        setMessages(doc.data().messages || []);
      } else {
        // Initial message
        const initialMsg: ChatMessage = { 
          role: 'model', 
          text: selectedModule 
            ? `Hi! I'm Valerie. I see you're starting the "${selectedModule.title}" module. Let's build a mental model for this together! What's your current understanding of ${selectedModule.title.toLowerCase()}?`
            : "Hi! I'm Valerie. I'm here to help you build mental models for science. What's on your mind today?",
          timestamp: new Date().toISOString()
        };
        setMessages([initialMsg]);
        setDoc(chatDoc, { userId, messages: [initialMsg], lastUpdated: new Date().toISOString() });
      }
    });

    return () => unsubscribe();
  }, [selectedModule]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const userMessage: ChatMessage = { 
      role: 'user', 
      text: input,
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const moduleContext = selectedModule
        ? `Module: ${selectedModule.title}. Gap to repair: ${selectedModule.gap}`
        : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newMessages.slice(0, -1).map(m => ({ role: m.role, text: m.text })),
          message: input,
          moduleContext
        })
      });

      const data = await res.json();
      const responseText = data.response || "Oops! My circuits are a bit tangled. Can you try saying that again?";
      
      const modelMessage: ChatMessage = { 
        role: 'model', 
        text: responseText,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, modelMessage];
      
      // Save to Firestore for memory
      await setDoc(doc(db, 'chat_history', userId), {
        userId,
        messages: finalMessages,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "Oops! My circuits are a bit tangled. Can you try saying that again?",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
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
          <div className="hidden md:block px-4 py-1.5 bg-white/20 dark:bg-slate-800/50 rounded-full text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
            {selectedModule.code}
          </div>
        )}
      </div>

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
                ? "bg-slate-900 dark:bg-slate-700 text-white rounded-tr-none" 
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-6 rounded-[32px] rounded-tl-none">
              <div className="flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-soft-pink rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-soft-pink rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-soft-pink rounded-full" />
              </div>
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
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Valerie a question..."
            className="w-full pl-6 pr-16 py-5 bg-cream dark:bg-slate-800 rounded-3xl border-2 border-transparent focus:border-soft-pink outline-none font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400/60 transition-all"
          />
          <button
            onClick={handleSend}
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
