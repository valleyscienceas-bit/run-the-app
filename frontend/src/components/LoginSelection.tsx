import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, School, ArrowLeft, GraduationCap, UserCircle, Briefcase, ShieldCheck, ArrowRight, Mail, Lock, User as UserIcon } from 'lucide-react';
import { UserRole, AccessPath, GradeLevel, UserProfile } from '../types';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, doc, setDoc, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from '../lib/firebase';
import { getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginSelectionProps {
  onBack: () => void;
  onLogin: (path: AccessPath, role: UserRole, details?: any) => void;
}

export function LoginSelection({ onBack, onLogin }: LoginSelectionProps) {
  const [path, setPath] = useState<AccessPath | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'selection' | 'form' | '2fa' | 'guest' | 'complete-profile'>('selection');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    username: '',
    parentEmail: '',
    grade: '6' as GradeLevel
  });
  const [twoFACode, setTwoFACode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      // 1. Try to activate or reset account via backend (branded email)
      const response = await fetch('/api/activate-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      const sessionData = await response.json();
      
      if (!response.ok) {
        throw new Error(sessionData.error || "Failed to send reset link.");
      }

      // 2. Trigger Firebase Auth's standard password reset email as a fail-safe backup.
      try {
        await sendPasswordResetEmail(auth, formData.email);
      } catch (fbErr) {
        console.warn("Firebase native email reset failed or redundant:", fbErr);
      }

      setMessage({ type: 'success', text: "Verification link sent! Please check your inbox (and spam) for an email from Valley Science." });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as UserProfile;
        onLogin(profileData.path, profileData.role, profileData);
      } else {
        // New user from Google - need to complete profile
        setGoogleUser(user);
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          name: user.displayName || ''
        }));
        setStep('complete-profile');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (path === 'district') {
      setStep('guest');
    } else if (path === 'individual') {
      setStep('form');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup' || step === 'complete-profile') {
        if (!formData.parentEmail) {
          throw new Error("Parent email is mandatory for individual students.");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!agreedToTerms) {
          throw new Error("You must agree to the Terms of Service to continue.");
        }
        // Verification code is sent to STUDENT email
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.email,
              subject: 'Your Valley Science Verification Code',
              text: `Your verification code is: ${code}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #0f172a;">Welcome to Valley Science!</h2>
                  <p>Please use the following code to verify your account:</p>
                  <div style="font-size: 32px; font-weight: bold; color: #ec4899; margin: 20px 0;">${code}</div>
                  <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
              `
            })
          });
          console.log(`[EMAIL] Verification Code sent to STUDENT (${formData.email})`);
        } catch (emailErr) {
          console.error("Failed to send email:", emailErr);
          console.log(`[FALLBACK] Verification Code: ${code}`);
        }
        
        setTwoFACode('');
        setStep('2fa');
      } else {
        // Real Firebase Login
        let loginEmail = formData.email;
        
        // Check if it's a username instead of an email
        if (!formData.email.includes('@')) {
          const q = query(collection(db, 'users'), where('username', '==', formData.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            loginEmail = userData.email;
          } else {
            throw new Error("Username not found. Please use your email or check your username.");
          }
        }

        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, formData.password);
        const user = userCredential.user;
        
        // Fetch profile from Firestore
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          onLogin(profileData.path, profileData.role, profileData);
        } else {
          // Fallback if profile missing
          onLogin('individual', role || 'student', { email: user.email });
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("An account with this email already exists. Please login instead.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (twoFACode === generatedCode) {
      setLoading(true);
      setError(null);
      try {
        let user = googleUser || auth.currentUser;
        
        if (!user) {
          // Create Firebase Auth User for email/pass signup
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          user = userCredential.user;
        }

        // Create Firestore Profile
        const profile: UserProfile = {
          uid: user.uid,
          name: formData.name,
          username: formData.username,
          email: formData.email,
          parentEmail: formData.parentEmail,
          role: role || 'student',
          path: 'individual',
          grade: formData.grade,
          xp: 0,
          isFirstTime: true,
          isPaid: false,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), profile);
        onLogin('individual', profile.role, profile);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError("This email is already registered. Try logging in.");
        } else {
          setError(err.message);
        }
        setStep(googleUser ? 'complete-profile' : 'form');
      } finally {
        setLoading(false);
      }
    } else {
      setError("Invalid code. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-12">
          {step === 'selection' && (
            <>
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-8 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Home
              </button>

              <h2 className="text-4xl font-black text-slate-900 mb-2">Welcome.</h2>
              <p className="text-slate-500 font-medium mb-12">Select your access path to continue.</p>

              <div className="space-y-4">
                <SelectionButton 
                  active={path === 'district'} 
                  onClick={() => { setPath('district'); setRole(null); }}
                  icon={<School className={path === 'district' ? 'text-white' : 'text-slate-400'} />}
                  title="District Partnership"
                  description="LASD, PAUSD, MVWSD students & teachers"
                />
                
                <SelectionButton 
                  active={path === 'individual'} 
                  onClick={() => { setPath('individual'); setRole(null); }}
                  icon={<Users className={path === 'individual' ? 'text-white' : 'text-slate-400'} />}
                  title="Individual Access"
                  description="Parents & independent learners"
                />
              </div>

              <AnimatePresence>
                {path && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 space-y-6"
                  >
                    <div className="flex gap-4">
                      {path === 'district' ? (
                        <>
                          <RoleButton active={role === 'teacher'} onClick={() => setRole('teacher')} icon={<Briefcase size={20} />} label="Teacher" />
                          <RoleButton active={role === 'student'} onClick={() => setRole('student')} icon={<GraduationCap size={20} />} label="Student" />
                        </>
                      ) : (
                        <>
                          <RoleButton active={role === 'parent'} onClick={() => setRole('parent')} icon={<UserCircle size={20} />} label="Parent" />
                          <RoleButton active={role === 'student'} onClick={() => setRole('student')} icon={<GraduationCap size={20} />} label="Student" />
                        </>
                      )}
                    </div>

                    {path === 'individual' && (
                      <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button 
                          onClick={() => setMode('login')}
                          className={cn("flex-1 py-2 rounded-xl text-sm font-bold transition-all", mode === 'login' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                        >
                          Login
                        </button>
                        {role !== 'parent' && (
                          <button 
                            onClick={() => setMode('signup')}
                            className={cn("flex-1 py-2 rounded-xl text-sm font-bold transition-all", mode === 'signup' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                          >
                            Sign Up
                          </button>
                        )}
                      </div>
                    )}

                    {role === 'parent' && mode === 'login' && (
                      <div className="p-4 bg-sage-green/5 border border-sage-green/20 rounded-2xl">
                        <p className="text-[10px] font-black text-sage-green uppercase tracking-widest mb-1">Parent Access</p>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Parent accounts are automatically generated when your student joins. Check your email for temporary credentials.
                        </p>
                      </div>
                    )}

                    <button 
                      onClick={handleNext}
                      disabled={!role}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                    >
                      {path === 'district' ? 'Continue as Guest' : (mode === 'login' ? 'Continue to Login' : 'Start Sign Up')}
                      <ArrowRight size={20} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {step === 'guest' && (
            <div className="text-center space-y-8 py-8">
              <div className="w-20 h-20 bg-sage-green/10 rounded-full flex items-center justify-center mx-auto">
                <Users size={40} className="text-sage-green" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">You are a Guest</h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                  District SSO is currently being provisioned for your school. You can explore the platform as a guest for now.
                </p>
              </div>
              <button 
                onClick={() => onLogin('district', role || 'student')}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all"
              >
                Enter as Guest
              </button>
              <button 
                onClick={() => setStep('selection')}
                className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
              >
                Change Access Path
              </button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <button 
                type="button"
                onClick={() => setStep('selection')}
                className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-8 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <h2 className="text-4xl font-black text-slate-900 mb-8">
                {mode === 'login' ? 'Login' : 'Create Account'}
              </h2>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
                  {error}
                </div>
              )}

              {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-sage-green/10 text-sage-green' : 'bg-red-50 text-red-600'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <Input label="Full Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="John Doe" icon={<UserIcon size={18} />} />
                    <Input label="Username" value={formData.username} onChange={v => setFormData({...formData, username: v})} placeholder="johndoe123" icon={<ShieldCheck size={18} />} />
                    <Input label="Parent/Guardian Email" type="email" value={formData.parentEmail} onChange={v => setFormData({...formData, parentEmail: v})} placeholder="parent@example.com" icon={<Users size={18} />} />
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Grade Level</label>
                      <select 
                        value={formData.grade}
                        onChange={e => setFormData({...formData, grade: e.target.value as GradeLevel})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all appearance-none"
                      >
                        {['3','4','5','6','7','8'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <Input 
                  label={mode === 'login' ? "Email Address/Username" : "Email Address"} 
                  type={mode === 'login' ? "text" : "email"}
                  value={formData.email} 
                  onChange={v => setFormData({...formData, email: v})} 
                  placeholder={mode === 'login' ? "you@example.com or username" : "you@example.com"} 
                  icon={<Mail size={18} />} 
                />
                <div className="relative">
                  <Input label="Password" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} placeholder="••••••••" icon={<Lock size={18} />} />
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-soft-pink uppercase tracking-widest hover:underline bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100"
                    >
                      Forgot?
                    </button>
                  )}
                </div>

                {mode === 'signup' && (
                  <Input label="Confirm Password" type="password" value={formData.confirmPassword} onChange={v => setFormData({...formData, confirmPassword: v})} placeholder="••••••••" icon={<ShieldCheck size={18} />} />
                )}
                
                {mode === 'signup' && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="tos"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-soft-pink focus:ring-soft-pink"
                    />
                    <label htmlFor="tos" className="text-xs text-slate-500 font-medium leading-relaxed">
                      I agree to the <button type="button" className="text-slate-900 font-bold hover:underline">Terms of Service</button> and <button type="button" className="text-slate-900 font-bold hover:underline">Privacy Policy</button>.
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-8">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Send Verification Code')}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-black tracking-widest">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <SocialButton icon={<img src="https://www.google.com/favicon.ico" className="w-5 h-5" />} onClick={handleGoogleLogin} />
                  <SocialButton icon={<img src="https://www.apple.com/favicon.ico" className="w-5 h-5" />} onClick={() => alert("Apple Login Setup: Requires Apple Developer Program. Enable in Firebase Console.")} />
                  <SocialButton icon={<img src="https://www.microsoft.com/favicon.ico" className="w-5 h-5" />} onClick={() => alert("Microsoft Login Setup: Requires Azure AD App. Enable in Firebase Console.")} />
                </div>
              </div>
            </form>
          )}

          {step === 'complete-profile' && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <h2 className="text-4xl font-black text-slate-900 mb-2">Almost there!</h2>
              <p className="text-slate-500 font-medium mb-8">Complete your profile to start learning.</p>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <Input label="Username" value={formData.username} onChange={v => setFormData({...formData, username: v})} placeholder="johndoe123" icon={<ShieldCheck size={18} />} />
                <Input label="Parent/Guardian Email" type="email" value={formData.parentEmail} onChange={v => setFormData({...formData, parentEmail: v})} placeholder="parent@example.com" icon={<Users size={18} />} />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Grade Level</label>
                  <select 
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: e.target.value as GradeLevel})}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all appearance-none"
                  >
                    {['3','4','5','6','7','8'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all mt-8"
              >
                {loading ? 'Processing...' : 'Verify Parent Email'}
              </button>
            </form>
          )}

          {step === '2fa' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-black text-slate-900">Verify Your Email</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                We've sent a verification code to <span className="text-slate-900 font-bold">{formData.email}</span>.
              </p>

              <div className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center">
                    {error}
                  </div>
                )}
                <input 
                  type="text"
                  maxLength={6}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-6 text-center text-4xl font-black tracking-[0.5em] text-slate-900 outline-none transition-all"
                />

                {/* Testing Helper: Display code in UI since console might be hard to find */}
                <div className="p-4 bg-soft-pink/5 border border-soft-pink/20 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-soft-pink uppercase tracking-widest mb-1">Testing Mode</p>
                  <p className="text-sm font-bold text-slate-600">Your simulated code is: <span className="text-slate-900 font-black">{generatedCode}</span></p>
                </div>
                
                <button 
                  onClick={handle2FAVerify}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Creating Account...' : 'Verify & Create Account'}
                </button>

                <p className="text-center text-xs text-slate-400 font-bold">
                  Didn't receive a code? <button type="button" className="text-soft-pink hover:underline">Resend</button>
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 p-8 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure Access</span>
          </div>
          {path === 'district' && (
            <span className="text-[10px] font-black text-sage-green uppercase tracking-widest">District SSO Enabled</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SocialButton({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="flex items-center justify-center p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-slate-50 transition-all"
    >
      {icon}
    </button>
  );
}

function SelectionButton({ active, onClick, icon, title, description }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string, description: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-6",
        active ? "border-slate-900 bg-slate-900 text-white shadow-xl" : "border-slate-100 bg-white hover:border-slate-200"
      )}
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", active ? "bg-white/20" : "bg-slate-50")}>
        {icon}
      </div>
      <div>
        <h3 className={cn("font-black text-lg", active ? "text-white" : "text-slate-900")}>{title}</h3>
        <p className={cn("text-xs font-medium", active ? "text-slate-300" : "text-slate-500")}>{description}</p>
      </div>
    </button>
  );
}

function RoleButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
        active ? "border-soft-pink bg-soft-pink/5 text-slate-900" : "border-slate-100 text-slate-400 hover:border-slate-200"
      )}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, icon }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string, icon?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input 
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl py-4 font-bold text-slate-900 placeholder:text-slate-300 outline-none transition-all",
            icon ? "pl-14 pr-6" : "px-6"
          )}
        />
      </div>
    </div>
  );
}
