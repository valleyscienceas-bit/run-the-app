import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Zap, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

interface PaymentFirewallProps {
  onPaymentSuccess: () => void;
  onSkip: () => void;
}

export function PaymentFirewall({ onPaymentSuccess, onSkip }: PaymentFirewallProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      onPaymentSuccess();
    }, 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-12">
          <div className="w-16 h-16 bg-soft-pink/10 rounded-2xl flex items-center justify-center mb-8">
            <Lock className="text-soft-pink" size={32} />
          </div>

          <h2 className="text-4xl font-black text-slate-900 mb-4">Curriculum Locked.</h2>
          <p className="text-slate-500 font-medium mb-12 leading-relaxed">
            Valley Science gates its premium pedagogical content behind a billing layer to ensure financial sustainability and high-quality AI mentoring.
          </p>

          <div className="bg-slate-50 rounded-3xl p-8 mb-12">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900">Individual Access Tier</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Full 3-8 Science Curriculum</p>
              </div>
              <div className="text-3xl font-black text-slate-900">$8<span className="text-sm text-slate-400">/mo</span></div>
              <p className="text-xs font-bold text-slate-400 mt-1">or $90/year</p>
            </div>

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <ShieldCheck size={18} className="text-sage-green" />
                Socratic AI Mentoring (Valerie)
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <Zap size={18} className="text-sage-green" />
                NGSS-Aligned Conceptual Mapping
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <CreditCard size={18} className="text-sage-green" />
                Linked Parent Dashboard
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handlePay}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
            >
              {loading ? 'Processing Transaction...' : 'Complete Enrollment'}
              {!loading && <ArrowRight size={20} />}
            </button>

            <div className="flex items-center justify-center gap-8 pt-4">
              <button 
                onClick={onSkip}
                className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-slate-500 transition-colors"
              >
                Discreet Sandbox Skip
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Secure Payment Gateway • COPPA/FERPA Compliant
          </p>
        </div>
      </motion.div>
    </div>
  );
}
