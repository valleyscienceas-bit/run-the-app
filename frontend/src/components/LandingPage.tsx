import React, { useState, useEffect } from 'react';
import { ValerieMascot } from './ValerieMascot';
import { ThemeToggle } from './ThemeToggle';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle2, Users, School, Zap, Brain, Beaker, BarChart3, MessageCircle, Layers, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

const VALERIE_MESSAGES = [
  "Hi! I'm Valerie. I'll help you build mental models, not just memorize definitions!",
  "Did you know? Science is about asking the right questions, not just finding answers.",
  "Ready to repair some conceptual gaps today? Let's dive in!",
  "I'm analyzing your scientific thinking to help you grow faster!",
  "Think of me as your personal scientific guide. What shall we explore?"
];

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [activeForm, setActiveForm] = useState<'none' | 'district' | 'contact' | 'feedback' | 'demo'>('none');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    district: '',
    role: '',
    message: ''
  });
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    message: '',
    file: null as File | null
  });
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [demoForm, setDemoForm] = useState({ name: '', email: '', reason: '' });

  // Reset form status when opening a new form or after delay
  useEffect(() => {
    if (activeForm !== 'none') {
      setContactStatus('idle');
    }
  }, [activeForm]);

  useEffect(() => {
    if (contactStatus === 'sent') {
      const timer = setTimeout(() => {
        setContactStatus('idle');
        setActiveForm('none');
      }, 2500);
      return () => clearTimeout(timer);
    } else if (contactStatus === 'error') {
      const timer = setTimeout(() => {
        setContactStatus('idle');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [contactStatus]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('sending');
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit demo request.');
      }
      setContactStatus('sent');
      setDemoForm({ name: '', email: '', reason: '' });
    } catch (err) {
      console.error('Demo request error:', err);
      setContactStatus('error');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('sending');
    
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'valley.science.as@gmail.com',
          subject: `District Inquiry: ${contactForm.district}`,
          text: `Name: ${contactForm.name}\nEmail: ${contactForm.email}\nPhone #: ${contactForm.phone || 'N/A'}\nDistrict: ${contactForm.district}\nRole: ${contactForm.role}\nMessage: ${contactForm.message}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #0f172a;">New District Inquiry</h2>
              <p><strong>From:</strong> ${contactForm.name} (${contactForm.email})</p>
              ${contactForm.phone ? `<p><strong>Phone #:</strong> ${contactForm.phone}</p>` : ''}
              <p><strong>District:</strong> ${contactForm.district}</p>
              <p><strong>Role:</strong> ${contactForm.role}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">${contactForm.message}</div>
            </div>
          `
        })
      });

      // Send confirmation to user
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactForm.email,
          subject: 'We received your Valley Science inquiry',
          text: `Hi ${contactForm.name}, thank you for reaching out. Our team will get back to you shortly regarding ${contactForm.district}.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #0f172a;">Inquiry Received</h2>
              <p>Hi ${contactForm.name},</p>
              <p>Thank you for reaching out to Valley Science. We've received your inquiry regarding <strong>${contactForm.district}</strong> and our team will be in touch shortly.</p>
              <p style="color: #64748b; font-size: 14px;">Best regards,<br>The Valley Science Team</p>
            </div>
          `
        })
      });

      setContactStatus('sent');
      setContactForm({ name: '', email: '', district: '', role: '', message: '' });
    } catch (err) {
      console.error("Contact form error:", err);
      setContactStatus('error');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % VALERIE_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-cream dark:bg-slate-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto sticky top-0 bg-cream/80 dark:bg-slate-950/90 backdrop-blur-md z-50 border-b border-transparent dark:border-slate-800">
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveForm('none');
          }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ValerieMascot size={40} />
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-100">VALLEY SCIENCE</span>
        </button>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400">
          <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">How It Works</a>
          <a href="#about" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">About Us</a>
          <a href="#plans" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Plans & Pricing</a>
          <button onClick={() => setActiveForm('contact')} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Contact Us</button>
          <button onClick={() => setActiveForm('feedback')} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Feedback</button>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" />
          <button 
            onClick={onLoginClick}
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            Login/Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage-green/10 text-sage-green rounded-full text-sm font-bold mb-6">
            <Zap size={16} />
            AI-Native Pedagogical Addendum
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8">
            Repairing <span className="text-sage-green block md:inline mt-2 md:mt-0">Conceptual Gaps</span> <br className="hidden md:block" /> in Science.
          </h1>
          <p className="text-xl text-slate-700 mb-4 leading-relaxed">
            Valley Science supplements local curricula by identifying where students struggle to visualize dynamics, mapping every interaction to NGSS standards.
          </p>
          <p className="text-sm font-bold text-slate-500 mb-8">
            Individual access: <span className="text-slate-900">$8/month</span> or <span className="text-slate-900">$90/year</span>
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onLoginClick}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
            >
              Create Account <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => setActiveForm('demo')}
              className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/30"
            >
              Request a Demo
            </button>
            <a 
              href="#how-it-works"
              className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-2xl font-bold hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center gap-2 text-slate-900 dark:text-slate-100"
            >
              Learn More
            </a>
          </div>
        </motion.div>

        <motion.div 
          className="relative flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-soft-pink/20 blur-[100px] rounded-full" />
          <div className="relative">
            <ValerieMascot 
              size={400} 
              isWaving={true} 
              expression={messageIndex % 2 === 0 ? 'happy' : 'excited'}
              className="drop-shadow-2xl" 
            />
            <AnimatePresence mode="wait">
              <motion.div 
                key={messageIndex}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="absolute -top-16 -right-20 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 max-w-[240px] z-10"
              >
                <div className="absolute -bottom-2 left-10 w-4 h-4 bg-white border-b border-r border-slate-100 rotate-45" />
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  "{VALERIE_MESSAGES[messageIndex]}"
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* How It Works — detailed product section */}
      <section id="how-it-works" className="bg-cream/30 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">What Your Child Actually Does</h2>
            <p className="text-slate-700 max-w-3xl mx-auto leading-relaxed">
              Valley Science is not another worksheet app. Students learn through Socratic AI conversations, interactive simulations, and NGSS-aligned modules — with a parent dashboard that shows real progress.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 mb-16">
            <ProductBlock
              icon={<MessageCircle className="text-soft-pink" size={28} />}
              title="Socratic AI — Meet Valerie"
              description="Valerie never gives direct answers. She asks guiding questions that help students build mental models and identify their own conceptual gaps. Powered by Google Gemini on a secure backend — your child's conversations stay private."
              placeholder="Valerie chat demo — GIF coming soon"
            />
            <ProductBlock
              icon={<Beaker className="text-sage-green" size={28} />}
              title="Interactive Simulations"
              description="Hands-on virtual labs let students manipulate variables, observe outcomes, and develop intuition for forces, matter, energy, and more — without a physical lab setup."
              placeholder="Simulation demo — GIF coming soon"
            />
            <ProductBlock
              icon={<Layers className="text-blue-500" size={28} />}
              title="NGSS-Aligned Curriculum"
              description="Structured modules for grades 3–8 mapped to California NGSS standards. Each unit includes lessons, a placement test, and a unit test to confirm understanding before moving on."
            />
            <ProductBlock
              icon={<BarChart3 className="text-purple-500" size={28} />}
              title="Progress You Can See"
              description="Students get a stats dashboard showing test scores, time spent learning, and conceptual gaps. Parents get a linked dashboard with the same data — no guessing whether your child is actually learning."
            />
          </div>

          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl">
            <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Sparkles className="text-soft-pink" /> What Makes Us Different
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <DiffItem title="Socratic, not spoon-fed" text="Most apps give answers. Valerie asks questions so students actually think." />
              <DiffItem title="Simulations, not videos" text="Students interact with science — they don't just watch someone else do it." />
              <DiffItem title="Gap-driven learning" text="Placement and unit tests identify exactly which concepts need work, then Valerie targets those gaps." />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">The "Definition Trap"</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Students can memorize formulas, but often fail to conceptualize the underlying physics. We bridge that gap.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="text-blue-600" />}
              title="Socratic AI"
              description="Valerie never gives direct answers. She asks leading questions to guide your discovery."
            />
            <FeatureCard 
              icon={<Zap className="text-orange-600" />}
              title="NGSS Aligned"
              description="Every module is mapped to California NGSS Evidence Statements for grades 3-8."
            />
            <FeatureCard 
              icon={<Users className="text-sage-green" />}
              title="Dual-Track Access"
              description="Customized experiences for both District Partnerships and Individual Learners."
            />
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="bg-cream/30 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-8">Built by Students, <br />For the Future.</h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-soft-pink/20 rounded-3xl flex-shrink-0 flex items-center justify-center font-black text-2xl text-slate-900">SS</div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Sidak Soni</h4>
                    <p className="text-slate-500 font-bold text-sm mb-2 uppercase tracking-widest">Co-Founder</p>
                    <p className="text-slate-700 leading-relaxed">Sidak is a freshman in high school from the South Bay Area. He built Valley Science because he saw classmates memorize definitions without ever understanding how science actually works — and wanted to fix that from a student's perspective.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-sage-green/20 rounded-3xl flex-shrink-0 flex items-center justify-center font-black text-2xl text-slate-900">AS</div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Ankan Shah</h4>
                    <p className="text-slate-500 font-bold text-sm mb-2 uppercase tracking-widest">Co-Founder</p>
                    <p className="text-slate-700 leading-relaxed">Ankan is a freshman in high school from the South Bay Area. He handles the technical side — building the AI integration, backend infrastructure, and the platform that makes Valerie and the curriculum work seamlessly.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
              <div className="aspect-video bg-slate-100 rounded-3xl mb-8 flex items-center justify-center overflow-hidden relative">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                  title="Valley Science Demo" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
              <p className="text-center text-slate-500 font-bold text-sm">Watch our 2-minute mission overview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing/Plans */}
      <section id="plans" className="py-24 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Choose Your Path</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingCard 
            title="District Partnership"
            price="Contact Sales"
            features={[
              "Teacher-Led Pacing",
              "Customized Curricula",
              "District Heat Maps",
              "COPPA/FERPA Compliant"
            ]}
            buttonText="Inquire Now"
            highlight={true}
            onClick={() => setActiveForm('district')}
          />
          <PricingCard 
            title="Individual Access"
            price="$8/mo"
            subPrice="or $90 billed annually"
            features={[
              "Open 3-8 Curriculum",
              "Parental Oversight",
              "Placement Testing",
              "Progress Portability"
            ]}
            buttonText="Start Learning"
            onClick={onLoginClick}
            secondaryButtonText="Request a Demo"
            onSecondaryClick={() => setActiveForm('demo')}
          />
        </div>
      </section>

      <AnimatePresence>
        {activeForm !== 'none' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveForm('none')}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-12">
                {activeForm === 'district' && (
                  <>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">District Inquiry</h2>
                    <p className="text-slate-500 font-medium mb-8">Bring Valley Science to your school or district.</p>
                    <form className="space-y-4" onSubmit={handleContactSubmit}>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" required value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="Jane Doe" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                        <input 
                          type="email" required value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="jane@district.edu" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Phone # (Optional)</label>
                        <input 
                          type="tel" value={contactForm.phone}
                          onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="+1 (650) 555-0000" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">District/School</label>
                        <input 
                          type="text" required value={contactForm.district}
                          onChange={(e) => setContactForm({...contactForm, district: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="Silicon Valley Unified" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Role</label>
                        <select 
                          required
                          value={contactForm.role === 'Administrator' || contactForm.role === 'Teacher' || contactForm.role === 'Parent' || contactForm.role === '' ? contactForm.role : 'Other'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContactForm({...contactForm, role: val === 'Other' ? 'Other: ' : val});
                          }}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all appearance-none"
                        >
                          <option value="" disabled>Select your role</option>
                          <option value="Administrator">Administrator</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Parent">Parent</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {contactForm.role.startsWith('Other: ') && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Please Specify Role</label>
                          <input 
                            type="text" required value={contactForm.role.replace('Other: ', '')}
                            onChange={(e) => setContactForm({...contactForm, role: `Other: ${e.target.value}`})}
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                            placeholder="e.g. Curriculum Director" 
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                        <textarea 
                          required value={contactForm.message}
                          onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all h-32 resize-none" 
                          placeholder="How can we help?"
                        ></textarea>
                      </div>
                      <button type="submit" disabled={contactStatus === 'sending'} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all mt-4 disabled:opacity-50">
                        {contactStatus === 'sending' ? 'Sending...' : 'Send Inquiry'}
                      </button>
                    </form>
                  </>
                )}

                {activeForm === 'contact' && (
                  <>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Contact Us</h2>
                    <p className="text-slate-500 font-medium mb-8">Have a question? We'd love to hear from you.</p>
                    <form className="space-y-4" onSubmit={handleContactSubmit}>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                        <input 
                          type="text" required value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="Jane Doe" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input 
                          type="email" required value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="jane@example.com" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Phone # (Optional)</label>
                        <input 
                          type="tel" value={contactForm.phone}
                          onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                          placeholder="+1 (650) 555-0000" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                        <textarea 
                          required value={contactForm.message}
                          onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all h-32 resize-none" 
                          placeholder="What's on your mind?"
                        ></textarea>
                      </div>
                      <button type="submit" disabled={contactStatus === 'sending'} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all mt-4 disabled:opacity-50">
                        {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
                      </button>
                    </form>
                  </>
                )}

                {activeForm === 'demo' && (
                  <>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Request a Demo</h2>
                    <p className="text-slate-500 font-medium mb-8">Try Valley Science before you commit. We'll email you when your demo is approved.</p>
                    <form className="space-y-4" onSubmit={handleDemoSubmit}>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input type="text" required value={demoForm.name} onChange={e => setDemoForm({...demoForm, name: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold outline-none transition-all" placeholder="Jane Doe" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input type="email" required value={demoForm.email} onChange={e => setDemoForm({...demoForm, email: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold outline-none transition-all" placeholder="you@example.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Why do you want a demo?</label>
                        <textarea required value={demoForm.reason} onChange={e => setDemoForm({...demoForm, reason: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold outline-none transition-all h-28 resize-none" placeholder="Tell us about your student or school..." />
                      </div>
                      <button type="submit" disabled={contactStatus === 'sending'} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black hover:bg-rose-700 transition-all mt-4 disabled:opacity-50 shadow-md shadow-rose-600/20">
                        {contactStatus === 'sending' ? 'Submitting...' : 'Submit Demo Request'}
                      </button>
                      {contactStatus === 'sent' && (
                        <p className="text-sage-green text-center font-bold text-sm mt-4">Request submitted! We'll email you when approved.</p>
                      )}
                    </form>
                  </>
                )}

                {activeForm === 'feedback' && (
                  <>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Feedback</h2>
                    <p className="text-slate-500 font-medium mb-8">Help us improve Valerie and Valley Science.</p>
                    <form className="space-y-4" onSubmit={async (e) => {
                      e.preventDefault();
                      setContactStatus('sending');
                      // Simulate feedback submission with file
                      setTimeout(() => {
                        setContactStatus('sent');
                        setFeedbackForm({ name: '', email: '', phone: '', role: '', message: '', file: null });
                      }, 1500);
                    }}>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                        <input 
                          type="text" required value={feedbackForm.name}
                          onChange={(e) => setFeedbackForm({...feedbackForm, name: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input 
                          type="email" required value={feedbackForm.email}
                          onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone / WhatsApp (Optional)</label>
                        <input 
                          type="tel" value={feedbackForm.phone}
                          onChange={(e) => setFeedbackForm({...feedbackForm, phone: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all"
                          placeholder="+1 (650) 555-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Role</label>
                        <select 
                          required
                          value={feedbackForm.role === 'Student' || feedbackForm.role === 'Teacher' || feedbackForm.role === 'Parent' || feedbackForm.role === '' ? feedbackForm.role : 'Other'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFeedbackForm({...feedbackForm, role: val === 'Other' ? 'Other: ' : val});
                          }}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all appearance-none"
                        >
                          <option value="" disabled>Select your role</option>
                          <option value="Student">Student</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Parent">Parent</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {feedbackForm.role.startsWith('Other: ') && (
                        <div className="space-y-2">
                          <input 
                            type="text" required value={feedbackForm.role.replace('Other: ', '')}
                            onChange={(e) => setFeedbackForm({...feedbackForm, role: `Other: ${e.target.value}`})}
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
                            placeholder="Please specify" 
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Feedback</label>
                        <textarea 
                          required value={feedbackForm.message}
                          onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-sage-green rounded-2xl px-6 py-4 font-bold outline-none transition-all h-32 resize-none" 
                        ></textarea>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Screenshot/File (Optional)</label>
                        <input 
                          type="file" 
                          onChange={(e) => setFeedbackForm({...feedbackForm, file: e.target.files?.[0] || null})}
                          className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                      </div>
                      <button type="submit" disabled={contactStatus === 'sending'} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all mt-4 disabled:opacity-50">
                        {contactStatus === 'sending' ? 'Sending...' : 'Submit Feedback'}
                      </button>
                    </form>
                  </>
                )}

                {contactStatus === 'sent' && (
                  <p className="text-sage-green text-center font-bold text-sm mt-4">Submitted successfully!</p>
                )}
                {contactStatus === 'error' && (
                  <p className="text-soft-pink text-center font-bold text-sm mt-4">Error submitting. Please try again.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ValerieMascot size={30} />
              <span className="text-xl font-black tracking-tighter">VALLEY SCIENCE</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Supplementing Silicon Valley science curricula with AI-native pedagogical scaffolding.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-sage-green">Contact Us</h4>
            <div className="space-y-4">
              <a href="mailto:valley.science.as@gmail.com" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                <span className="font-bold">valley.science.as@gmail.com</span>
              </a>
              <div className="flex items-center gap-3 text-slate-300">
                <span className="font-bold">650-469-3821</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-soft-pink">Legal</h4>
            <div className="space-y-2 text-sm text-slate-400 font-medium">
              <p>Privacy Policy</p>
              <p>Terms of Service</p>
              <p>COPPA/FERPA Compliance</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">© 2026 Valley Science. Built by Founders for the future of science.</p>
        </div>
      </footer>
    </div>
  );
}

function ProductBlock({ icon, title, description, placeholder }: { icon: React.ReactNode, title: string, description: string, placeholder?: string }) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-5">{icon}</div>
      <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-700 leading-relaxed mb-4">{description}</p>
      {placeholder && (
        <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-400">{placeholder}</p>
        </div>
      )}
    </div>
  );
}

function DiffItem({ title, text }: { title: string, text: string }) {
  return (
    <div>
      <h4 className="font-black text-slate-900 mb-2">{title}</h4>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-cream/30 rounded-3xl border border-slate-100 hover:shadow-xl transition-all">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({ title, price, subPrice, features, buttonText, highlight = false, onClick, secondaryButtonText, onSecondaryClick }: { title: string, price: string, subPrice?: string, features: string[], buttonText: string, highlight?: boolean, onClick?: () => void, secondaryButtonText?: string, onSecondaryClick?: () => void }) {
  return (
    <div className={`p-10 rounded-[40px] border-2 ${highlight ? 'border-sage-green bg-white shadow-2xl scale-105' : 'border-slate-200 bg-white/50'}`}>
      <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
      <div className="flex flex-col mb-8">
        <div className="text-4xl font-black text-slate-900">{price}</div>
        {subPrice && <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{subPrice}</div>}
      </div>
      <ul className="space-y-4 mb-10">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
            <CheckCircle2 size={20} className="text-sage-green" />
            {f}
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        <button 
          onClick={onClick}
          className={`w-full py-4 rounded-2xl font-bold transition-all ${highlight ? 'bg-sage-green text-white hover:bg-sage-green/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
          {buttonText}
        </button>
        {secondaryButtonText && onSecondaryClick && (
          <button onClick={onSecondaryClick} className="w-full py-4 rounded-2xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20">
            {secondaryButtonText}
          </button>
        )}
      </div>
    </div>
  );
}
