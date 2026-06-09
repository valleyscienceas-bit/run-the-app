import React, { useState } from 'react';
import { ValerieMascot } from './ValerieMascot';
import { SocraticChat } from './SocraticChat';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export function ValerieWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] max-w-[90vw] h-[600px] shadow-2xl rounded-3xl overflow-hidden border border-soft-pink"
          >
            <div className="relative h-full">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 z-[110] p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
              <SocraticChat selectedModule={null} onBack={() => setIsOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white p-2 rounded-full shadow-xl border-4 border-soft-pink relative"
      >
        <ValerieMascot size={60} isWaving={!isOpen} />
        {!isOpen && (
          <div className="absolute -top-12 -left-20 bg-white px-4 py-2 rounded-2xl shadow-lg border border-slate-100 text-xs font-bold whitespace-nowrap animate-bounce">
            Need a hint? 🤖
          </div>
        )}
      </motion.button>
    </div>
  );
}
