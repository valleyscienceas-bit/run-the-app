import { useState, useEffect, type FormEvent } from 'react';
import { BACK_LINK_CLASS, TEXT_LINK_CLASS } from '../lib/buttonStyles';
import { motion, AnimatePresence } from 'motion/react';
import { Users, School, ArrowLeft, GraduationCap, UserCircle, Briefcase, ShieldCheck, ArrowRight, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { UserRole, AccessPath, GradeLevel, UserProfile } from '../types';
import { FormError } from './FormError';
import { INPUT_CLASS, INPUT_CLASS_WITH_ICON } from '../lib/formStyles';
import { personNameFromAuthDisplayName } from '../lib/authDisplayName';
import { districtRoleLabel, validateLoginPathAndRole } from '../lib/districtLogin';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, signOut, doc, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from '../lib/firebase';
import { getMfaPending, setMfaPending, clearMfaPending } from '../lib/mfaSession';
import { getDoc } from 'firebase/firestore';
import { getSubmitErrorMessage, parseApiError } from '../utils/formSubmit';
import { getPasswordValidationError, PASSWORD_REQUIREMENTS_MESSAGE } from '../lib/passwordValidation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginSelectionProps {
  onBack: () => void;
  onLogin: (path: AccessPath, role: UserRole, details?: any) => void;
  initialMode?: 'login' | 'signup';
  resumeMfaLogin?: boolean;
}

const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  username: '',
  parentEmail: '',
  grade: '6' as GradeLevel
};

export function LoginSelection({ onBack, onLogin, initialMode = 'login', resumeMfaLogin = false }: LoginSelectionProps) {
  const [path, setPath] = useState<AccessPath | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'selection' | 'form' | 'forgot-password' | '2fa' | 'login-2fa' | 'complete-profile'>('selection');
  
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [twoFACode, setTwoFACode] = useState('');
  const [loginMfaMethod, setLoginMfaMethod] = useState<'email' | 'totp' | null>(null);
  const [loginMfaEmail, setLoginMfaEmail] = useState('');
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resumeMfaLogin) return;
    const pending = getMfaPending();
    if (!pending) return;
    setPath('individual');
    setMode('login');
    setLoginMfaMethod(pending.method);
    setLoginMfaEmail(pending.email);
    setFormData((prev) => ({ ...prev, email: pending.email }));
    setStep('login-2fa');
  }, [resumeMfaLogin]);

  const beginMfaLogin = async (
    profileData: UserProfile,
    user: { uid: string; email: string | null; getIdToken: () => Promise<string> }
  ) => {
    const email = profileData.email || user.email || '';
    const method = profileData.mfaMethod!;
    setMfaPending({ uid: user.uid, email, method });
    setLoginMfaMethod(method);
    setLoginMfaEmail(email);
    setFormData((prev) => ({ ...prev, email }));

    if (method === 'email') {
      const idToken = await user.getIdToken();
      const codeRes = await fetch('/api/mfa/send-login-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!codeRes.ok) {
        const err = await codeRes.json();
        throw new Error(err.error || 'Failed to send login verification code.');
      }
    }

    await signOut(auth);
    setTwoFACode('');
    setStep('login-2fa');
  };

  const completeProfileLogin = async (profileData: UserProfile) => {
    onLogin(profileData.path, profileData.role, profileData);
  };

  const handleAuthenticatedLogin = async (
    profileData: UserProfile,
    user: { uid: string; email: string | null; getIdToken: () => Promise<string> }
  ) => {
    if (
      profileData.path === 'individual' &&
      profileData.mfaEnabled &&
      (profileData.mfaMethod === 'email' || profileData.mfaMethod === 'totp')
    ) {
      await beginMfaLogin(profileData, user);
      return;
    }
    await completeProfileLogin(profileData);
  };

  const setFormError = (msg: string) => {
    setError(msg);
    setErrorShake(true);
    setTimeout(() => setErrorShake(false), 400);
  };

  const clearErrors = () => {
    setError(null);
    setMessage(null);
  };

  const handleForgotPassword = async (e?: FormEvent) => {
    e?.preventDefault();
    const email = formData.email.trim();
    if (!email) {
      setFormError('Enter the email address for your account.');
      return;
    }
    if (!email.includes('@')) {
      setFormError('Use your account email (not username) so we can send a reset link.');
      return;
    }
    setLoading(true);
    clearErrors();
    try {
      const response = await fetch('/api/activate-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const sessionData = await response.json();
      if (!response.ok) {
        throw new Error(sessionData.error || 'Failed to send reset link.');
      }

      try {
        await sendPasswordResetEmail(auth, email);
      } catch (fbErr) {
        console.warn('Firebase native email reset failed or redundant:', fbErr);
      }

      setMessage({
        type: 'success',
        text: 'Password reset email sent. Check your inbox (and spam) for a message from Valley Science, then open the link to choose a new password.',
      });
    } catch (err: any) {
      setFormError(err.message || getSubmitErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const ensureSandboxSeeded = async () => {
    const res = await fetch('/api/seed-sandbox', { method: 'POST' });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Failed to prepare the district sandbox.'));
    }
    return res.json();
  };

  const handleSandboxLogin = async () => {
    setLoading(true);
    clearErrors();
    try {
      await ensureSandboxSeeded();
      const userCredential = await signInWithEmailAndPassword(auth, 'sandbox.teacher@valley-science.demo', 'Sandbox123!');
      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!profileDoc.exists()) {
        throw new Error('Sandbox teacher profile is missing. Please try again.');
      }
      // onAuthStateChanged loads the full profile and teacher dashboard data.
    } catch (err: unknown) {
      setFormError(getSubmitErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxParentLogin = async () => {
    setLoading(true);
    clearErrors();
    try {
      await ensureSandboxSeeded();
      const userCredential = await signInWithEmailAndPassword(auth, 'sandbox.parent@valley-science.demo', 'Sandbox123!');
      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!profileDoc.exists()) {
        throw new Error('Sandbox parent profile is missing. Please try again.');
      }
    } catch (err: unknown) {
      setFormError(getSubmitErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxStudentLogin = async () => {
    setLoading(true);
    clearErrors();
    try {
      await ensureSandboxSeeded();
      const userCredential = await signInWithEmailAndPassword(auth, 'sandbox.student1@valley-science.demo', 'Sandbox123!');
      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!profileDoc.exists()) {
        throw new Error('Sandbox student profile is missing. Please try again.');
      }
      // onAuthStateChanged loads the full profile and student dashboard data.
    } catch (err: unknown) {
      setFormError(getSubmitErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = (toStep: typeof step) => {
    setFormData({ ...EMPTY_FORM });
    setError(null);
    setMessage(null);
    setAgreedToTerms(false);
    setTwoFACode('');
    setStep(toStep);
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
        await handleAuthenticatedLogin(profileData, user);
      } else {
        // New user from Google - need to complete profile
        setGoogleUser(user);
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          name: personNameFromAuthDisplayName(user.displayName || '')
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
    // Always clear fields when navigating to a new step
    setFormData({ ...EMPTY_FORM });
    setError(null);
    setMessage(null);
    setAgreedToTerms(false);
    if (path === 'district') {
      setMode('login');
      setStep('form');
    } else if (path === 'individual') {
      // Parents can only log in — accounts are created when their child signs up
      if (role === 'parent') {
        setMode('login');
      }
      setStep('form');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    try {
      if (mode === 'signup' || step === 'complete-profile') {
        if (!formData.parentEmail) {
          throw new Error("Parent email is mandatory for individual students.");
        }
        if (mode === 'signup' && step === 'form') {
          const passwordError = getPasswordValidationError(formData.password);
          if (passwordError) {
            throw new Error(passwordError);
          }
        }
        if (mode === 'signup' && step === 'form' && formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (step === 'form' && mode === 'signup' && !agreedToTerms) {
          throw new Error("You must agree to the Terms of Service to continue.");
        }
        // Send verification code via backend (10-min expiry)
        const codeRes = await fetch('/api/send-verification-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            purpose: 'signup',
            ...(mode === 'signup' && step === 'form' ? { password: formData.password } : {}),
          })
        });
        if (!codeRes.ok) {
          const err = await codeRes.json();
          throw new Error(err.error || 'Failed to send verification code.');
        }
        
        setTwoFACode('');
        setStep('2fa');
      } else {
        // Real Firebase Login
        let loginEmail = formData.email;
        
        // Check if it's a username instead of an email — use backend to avoid Firestore rule issues
        if (!formData.email.includes('@')) {
          const lookupRes = await fetch('/api/lookup-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.email })
          });
          const lookupData = await lookupRes.json();
          if (!lookupRes.ok) {
            throw new Error("Username not found. Please use your email or check your username.");
          }
          loginEmail = lookupData.email;
        }

        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, formData.password);
        const user = userCredential.user;
        
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (!profileDoc.exists()) {
          await signOut(auth);
          throw new Error('No Valley Science profile found for this account. Contact your school or use Individual Access to sign up.');
        }

        const profileData = profileDoc.data() as UserProfile;

        const pathCheck = validateLoginPathAndRole(path, role, profileData);
        if (pathCheck.ok === false) {
          await signOut(auth);
          throw new Error(pathCheck.message);
        }

        await handleAuthenticatedLogin(profileData, user);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setFormError("An account with this email already exists. Please login instead.");
      } else {
        setFormError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async () => {
    setLoading(true);
    clearErrors();
    try {
      const verifyRes = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: twoFACode, purpose: 'signup' })
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Invalid verification code.');
      }

      let user = googleUser || auth.currentUser;
        
        if (!user) {
          const passwordError = getPasswordValidationError(formData.password);
          if (passwordError) {
            throw new Error(passwordError);
          }
          // Create Firebase Auth User for email/pass signup
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          user = userCredential.user;
        }

        // Create Firestore Profile via backend (Admin SDK bypasses security rules)
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
          hasLoggedInBefore: false,
          createdAt: new Date().toISOString()
        };

        const profileRes = await fetch('/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, profile })
        });
        if (!profileRes.ok) {
          const err = await profileRes.json();
          throw new Error(err.error || 'Failed to create profile');
        }
        onLogin('individual', profile.role, profile);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setFormError("This email is already registered. Try logging in.");
      } else {
        setFormError(err.message);
      }
      setStep(googleUser ? 'complete-profile' : 'form');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin2FAVerify = async () => {
    setLoading(true);
    clearErrors();
    try {
      const pending = getMfaPending();
      const body: Record<string, string> = { email: loginMfaEmail };
      if (pending?.uid) body.uid = pending.uid;
      if (loginMfaMethod === 'email') {
        body.emailCode = twoFACode;
      } else {
        body.totpCode = twoFACode;
      }

      const res = await fetch('/api/mfa/complete-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Invalid verification code.');
      }

      const { customToken, profile } = await res.json();
      clearMfaPending();
      await signInWithCustomToken(auth, customToken);
      onLogin(profile.path, profile.role, profile);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginCode = async () => {
    clearErrors();
    setMessage({ type: 'error', text: 'Sign in with your password again to receive a new login code.' });
  };

  const handleResendCode = async () => {
    clearErrors();
    setLoading(true);
    try {
      const res = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          purpose: 'signup',
          ...(formData.password ? { password: formData.password } : {}),
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to resend code.');
      }
      setMessage({ type: 'success', text: 'A new code has been sent. It expires in 10 minutes.' });
      setTwoFACode('');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-slate-950 flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-12">
          {step === 'selection' && (
            <>
              <button 
                onClick={onBack}
                className={`${BACK_LINK_CLASS} mb-8`}
              >
                <ArrowLeft size={16} /> Back to Home
              </button>

              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">Welcome.</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-12">Select your access path to continue.</p>

              <div className="space-y-4">
                <SelectionButton 
                  active={path === 'district'} 
                  onClick={() => { setPath('district'); setRole(null); }}
                  icon={<School className={path === 'district' ? 'text-soft-pink' : 'text-slate-400 dark:text-slate-500'} />}
                  title="District Partnership"
                  description="LASD, PAUSD, MVWSD students, parents & teachers"
                />
                
                <SelectionButton 
                  active={path === 'individual'} 
                  onClick={() => { setPath('individual'); setRole(null); }}
                  icon={<Users className={path === 'individual' ? 'text-soft-pink' : 'text-slate-400 dark:text-slate-500'} />}
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
                          <RoleButton active={role === 'parent'} onClick={() => { setRole('parent'); setMode('login'); }} icon={<UserCircle size={20} />} label="Parent" />
                          <RoleButton active={role === 'student'} onClick={() => setRole('student')} icon={<GraduationCap size={20} />} label="Student" />
                        </>
                      ) : (
                        <>
                          <RoleButton active={role === 'parent'} onClick={() => { setRole('parent'); setMode('login'); }} icon={<UserCircle size={20} />} label="Parent" />
                          <RoleButton active={role === 'student'} onClick={() => setRole('student')} icon={<GraduationCap size={20} />} label="Student" />
                        </>
                      )}
                    </div>

                    {path === 'individual' && role !== 'parent' && (
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                        <button 
                          onClick={() => { setMode('login'); clearErrors(); }}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-black transition-all",
                            mode === 'login'
                              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          )}
                        >
                          Log In
                        </button>
                        <button 
                          onClick={() => { setMode('signup'); clearErrors(); }}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-black transition-all",
                            mode === 'signup'
                              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          )}
                        >
                          Sign Up
                        </button>
                      </div>
                    )}

                    {role === 'parent' && (
                      <div className="p-4 bg-sage-green/5 border border-sage-green/20 rounded-2xl">
                        <p className="text-xs font-black text-sage-green uppercase tracking-widest mb-1">Parent Login Only</p>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {path === 'district'
                            ? 'Parent accounts are created by your school district. Use the email from your welcome message to log in.'
                            : 'Parent accounts are created when your child signs up. Use the email from your welcome message to log in.'}
                        </p>
                      </div>
                    )}

                    <button 
                      onClick={handleNext}
                      disabled={!role}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                    >
                      {mode === 'login' ? 'Continue to Login' : 'Start Sign Up'}
                      <ArrowRight size={20} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <button 
                type="button"
                onClick={() => handleGoBack('selection')}
                className={`${BACK_LINK_CLASS} mb-8`}
              >
                <ArrowLeft size={16} /> Back
              </button>

              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">
                {path === 'district' ? 'District Login' : (mode === 'login' ? 'Login' : 'Create Account')}
              </h2>

              {path === 'district' && (
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                  Sign in with the email and password provided by your school district. LASD, PAUSD, and MVWSD accounts are supported.
                </p>
              )}

              {mode === 'signup' && path !== 'district' && (
                <div className="mb-6 p-4 bg-soft-pink/10 border border-soft-pink/20 rounded-2xl">
                  <p className="text-xs font-black text-soft-pink uppercase tracking-widest mb-1">Pricing</p>
                  <p className="text-sm font-bold text-slate-700">
                    Individual access is <span className="text-slate-900 dark:text-slate-100">$8/month</span> or <span className="text-slate-900 dark:text-slate-100">$90/year</span> — shown before payment after signup.
                  </p>
                </div>
              )}

              <FormError message={error} shake={errorShake} />

              {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-sage-green/10 text-sage-green' : 'bg-red-50 text-red-600'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <Input label="Full Name" value={formData.name} onChange={v => { clearErrors(); setFormData({...formData, name: v}); }} placeholder="John Doe" icon={<UserIcon size={18} />} />
                    <Input label="Username" value={formData.username} onChange={v => { clearErrors(); setFormData({...formData, username: v}); }} placeholder="johndoe123" icon={<ShieldCheck size={18} />} />
                    <Input label="Parent/Guardian Email" type="email" value={formData.parentEmail} onChange={v => { clearErrors(); setFormData({...formData, parentEmail: v}); }} placeholder="parent@example.com" icon={<Users size={18} />} />
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Grade Level</label>
                      <select 
                        value={formData.grade}
                        onChange={e => setFormData({...formData, grade: e.target.value as GradeLevel})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-slate-100 outline-none transition-all appearance-none"
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
                  onChange={v => { clearErrors(); setFormData({...formData, email: v}); }} 
                  placeholder={mode === 'login' ? "you@example.com or username" : "you@example.com"} 
                  icon={<Mail size={18} />} 
                />
                <Input label="Password" type="password" value={formData.password} onChange={v => { clearErrors(); setFormData({...formData, password: v}); }} placeholder="••••••••" icon={<Lock size={18} />} />
                {mode === 'signup' && (
                  <p className="text-xs text-slate-400 font-medium ml-1 -mt-2 leading-relaxed">
                    {PASSWORD_REQUIREMENTS_MESSAGE}
                  </p>
                )}
                {mode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => { clearErrors(); setStep('forgot-password'); }}
                      className="text-sm font-black text-soft-pink hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

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
                      I agree to the <button type="button" className="text-sm text-slate-900 font-bold hover:underline">Terms of Service</button> and <button type="button" className="text-slate-900 font-bold hover:underline">Privacy Policy</button>.
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

                {path === 'district' && (
                  <>
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-black tracking-widest">Or explore the sandbox</span></div>
                    </div>

                    {role === 'teacher' && (
                      <button
                        type="button"
                        onClick={handleSandboxLogin}
                        disabled={loading}
                        className="w-full bg-sage-green text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Try Sandbox (Demo Teacher)'}
                      </button>
                    )}
                    {role === 'student' && (
                      <button
                        type="button"
                        onClick={handleSandboxStudentLogin}
                        disabled={loading}
                        className="w-full bg-sage-green text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Try Sandbox (Demo Student)'}
                      </button>
                    )}
                    {role === 'parent' && (
                      <button
                        type="button"
                        onClick={handleSandboxParentLogin}
                        disabled={loading}
                        className="w-full bg-sage-green text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Try Sandbox (Demo Parent)'}
                      </button>
                    )}
                    <p className="text-xs text-slate-400 font-bold text-center">
                      Sandbox password for all demo accounts: <code className="text-slate-600 dark:text-slate-300">Sandbox123!</code>
                    </p>
                  </>
                )}

                {path !== 'district' && (
                  <>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-700"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-black tracking-widest">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <SocialButton icon={<img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />} onClick={handleGoogleLogin} />
                  <SocialButton icon={<img src="https://www.apple.com/favicon.ico" className="w-5 h-5" alt="" />} onClick={() => alert("Apple Login Setup: Requires Apple Developer Program. Enable in Firebase Console.")} />
                  <SocialButton icon={<img src="https://www.microsoft.com/favicon.ico" className="w-5 h-5" alt="" />} onClick={() => alert("Microsoft Login Setup: Requires Azure AD App. Enable in Firebase Console.")} />
                </div>
                  </>
                )}
              </div>
            </form>
          )}

          {step === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <button
                type="button"
                onClick={() => { clearErrors(); setStep('form'); setMode('login'); }}
                className={`${BACK_LINK_CLASS} mb-8`}
              >
                <ArrowLeft size={16} /> Back to login
              </button>
              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">Reset password</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-2 leading-relaxed">
                Enter the email on your Valley Science account. We&apos;ll send a secure link so you can choose a new password.
              </p>
              <p className="text-xs font-bold text-slate-400 mb-6">
                Works for student, parent, and teacher accounts. Use your email address (not username).
              </p>
              {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold border ${
                  message.type === 'success'
                    ? 'bg-sage-green/10 border-sage-green/20 text-sage-green'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400'
                }`}>
                  {message.text}
                </div>
              )}
              <FormError message={error} shake={errorShake} />
              <Input
                label="Account Email"
                type="email"
                value={formData.email}
                onChange={v => { clearErrors(); setFormData({ ...formData, email: v }); }}
                placeholder="you@example.com"
                icon={<Mail size={18} />}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              {message?.type === 'success' && (
                <button
                  type="button"
                  onClick={() => { clearErrors(); setStep('form'); setMode('login'); }}
                  className="w-full font-black text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Return to login
                </button>
              )}
            </form>
          )}

          {step === 'complete-profile' && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">Almost there!</h2>
              <p className="text-slate-500 font-medium mb-8">Complete your profile to start learning.</p>

              <FormError message={error} shake={errorShake} />

              <div className="space-y-4">
                <Input label="Username" value={formData.username} onChange={v => { clearErrors(); setFormData({...formData, username: v}); }} placeholder="johndoe123" icon={<ShieldCheck size={18} />} />
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

          {step === 'login-2fa' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100">Two-Factor Authentication</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {loginMfaMethod === 'email' ? (
                  <>We've sent a login code to <span className="text-slate-900 dark:text-slate-100 font-bold">{loginMfaEmail}</span>. Codes expire in 10 minutes.</>
                ) : (
                  <>Enter the 6-digit code from your authenticator app for <span className="text-slate-900 dark:text-slate-100 font-bold">{loginMfaEmail}</span>.</>
                )}
              </p>

              <FormError message={error} shake={errorShake} />

              <div className="space-y-6">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-6 text-center text-4xl font-black tracking-[0.5em] text-slate-900 dark:text-slate-100 outline-none transition-all"
                />

                <button 
                  onClick={handleLogin2FAVerify}
                  disabled={loading || twoFACode.length !== 6}
                  className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-2xl font-black hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>

                {loginMfaMethod === 'email' && (
                  <p className="text-center text-xs text-slate-400 font-bold">
                    Didn't receive a code? <button type="button" onClick={handleResendLoginCode} disabled={loading} className="text-soft-pink hover:underline disabled:opacity-50">Request help</button>
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    clearMfaPending();
                    setStep('form');
                    setTwoFACode('');
                  }}
                  className="w-full text-sm font-bold text-slate-500 hover:text-slate-700"
                >
                  Back to login
                </button>
              </div>
            </div>
          )}

          {step === '2fa' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100">Verify Your Email</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                We've sent a verification code to <span className="text-slate-900 dark:text-slate-100 font-bold">{formData.email}</span>. Codes expire in 10 minutes.
              </p>

              <FormError message={error} shake={errorShake} />

              <div className="space-y-6">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-6 text-center text-4xl font-black tracking-[0.5em] text-slate-900 dark:text-slate-100 outline-none transition-all"
                />

                <button 
                  onClick={handle2FAVerify}
                  disabled={loading || twoFACode.length !== 6}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Creating Account...' : 'Verify & Create Account'}
                </button>

                <p className="text-center text-xs text-slate-400 font-bold">
                  Didn't receive a code? <button type="button" onClick={handleResendCode} disabled={loading} className="text-soft-pink hover:underline disabled:opacity-50">Resend</button>
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
      className="flex items-center justify-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
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
        active
          ? "border-soft-pink bg-soft-pink/10 dark:bg-soft-pink/15 ring-2 ring-soft-pink/40 shadow-lg scale-[1.01]"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
        active ? "bg-soft-pink/20 text-soft-pink" : "bg-slate-50 dark:bg-slate-700 text-slate-400"
      )}>
        {icon}
      </div>
      <div>
        <h3 className={cn("font-black text-lg", active ? "text-slate-900 dark:text-slate-100" : "text-slate-900 dark:text-slate-100")}>{title}</h3>
        <p className={cn("text-xs font-medium", active ? "text-slate-600 dark:text-slate-400" : "text-slate-500 dark:text-slate-400")}>{description}</p>
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
        active ? "border-soft-pink bg-soft-pink/10 dark:bg-soft-pink/15 text-slate-900 dark:text-slate-100 ring-1 ring-soft-pink/30" : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
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
          className={cn(icon ? INPUT_CLASS_WITH_ICON : INPUT_CLASS)}
        />
      </div>
    </div>
  );
}
