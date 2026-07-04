import { useState } from 'react';
import { ShieldCheck, Mail, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import {
  auth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider
} from '../lib/firebase';
import { getSubmitErrorMessage, parseApiError } from '../utils/formSubmit';

interface MfaSettingsProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

type MfaStep = 'idle' | 'reauth' | 'choose-method' | 'email-verify' | 'totp-setup' | 'totp-verify' | 'disable';

function formatAuthError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed. Please try again.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Please try again.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (code === 'auth/requires-recent-login') {
      return 'Please sign out, sign in again, then retry this change.';
    }
    if (code === 'auth/user-mismatch') {
      return 'Account mismatch during reauthentication. Please sign out and sign in again.';
    }
  }
  return err instanceof Error ? err.message : 'Authentication failed.';
}

function verificationSentMessage(data: { emailSent?: boolean; simulated?: boolean }): string {
  if (data.simulated || data.emailSent === false) {
    return 'Verification code generated. In development, check the backend terminal for the code.';
  }
  return 'Verification code sent to your email.';
}

export function MfaSettings({ profile, onUpdateProfile }: MfaSettingsProps) {
  const [step, setStep] = useState<MfaStep>('idle');
  const [loading, setLoading] = useState(false);
  const [disablingFlow, setDisablingFlow] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState('');

  const accountEmail = (auth.currentUser?.email || profile.email || '').trim();
  const isGoogleAccount = auth.currentUser?.providerData.some((p) => p.providerId === 'google.com') ?? false;

  const getIdToken = async (forceRefresh = false) => {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in.');
    return user.getIdToken(forceRefresh);
  };

  const authedJsonRequest = async (
    input: string,
    init: RequestInit,
    fallbackError: string
  ): Promise<any> => {
    const doRequest = async (forceRefresh: boolean) => {
      const idToken = await getIdToken(forceRefresh);
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${idToken}`);
      const res = await fetch(input, { ...init, headers });
      return res;
    };

    let res = await doRequest(false);
    if (res.status === 401) {
      // Retry once with a freshly minted token to handle stale auth sessions.
      res = await doRequest(true);
    }

    if (!res.ok) {
      throw new Error(await parseApiError(res, fallbackError));
    }

    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const sendVerificationCode = async (purpose: 'enable-mfa' | 'disable-mfa') => {
    if (!accountEmail) {
      throw new Error('Your account has no email on file. Contact support to enable two-factor authentication.');
    }

    const data = await authedJsonRequest('/api/send-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: accountEmail, purpose })
    }, 'Failed to send verification code.');
    return data as { emailSent?: boolean; simulated?: boolean };
  };

  const reauthenticate = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in.');

    if (isGoogleAccount) {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      return;
    }

    if (!password) throw new Error('Enter your password to continue.');
    if (!user.email) throw new Error('Account email is missing.');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  };

  const handleStartEnable = () => {
    setMessage(null);
    setPassword('');
    setCode('');
    setDisablingFlow(false);
    setStep('reauth');
  };

  const handleStartDisable = () => {
    setMessage(null);
    setPassword('');
    setCode('');
    setDisablingFlow(true);
    setStep('reauth');
  };

  const handleReauthSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await reauthenticate();

      if (disablingFlow) {
        if (profile.mfaMethod === 'email') {
          const data = await sendVerificationCode('disable-mfa');
          setMessage({ type: 'success', text: verificationSentMessage(data) });
        }
        setStep('disable');
      } else {
        setStep('choose-method');
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: formatAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseEmail = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await sendVerificationCode('enable-mfa');
      setCode('');
      setStep('email-verify');
      setMessage({ type: 'success', text: verificationSentMessage(data) });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send code.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseTotp = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await authedJsonRequest('/api/mfa/totp/enroll-start', {
        method: 'POST',
      }, 'Failed to start authenticator setup. Please reauthenticate and try again.');
      setQrDataUrl(data.qrDataUrl);
      setManualKey(data.manualKey);
      setCode('');
      setStep('totp-setup');
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getSubmitErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableEmail = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await authedJsonRequest('/api/mfa/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'enable', mfaMethod: 'email', emailCode: code })
      }, 'Failed to enable two-factor authentication.');

      onUpdateProfile({ ...profile, mfaEnabled: true, mfaMethod: 'email' });
      setMessage({ type: 'success', text: 'Email two-factor authentication is now enabled.' });
      setStep('idle');
      setCode('');
      setDisablingFlow(false);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getSubmitErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTotp = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await authedJsonRequest('/api/mfa/totp/enroll-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ totpCode: code })
      }, 'Failed to complete authenticator setup.');

      onUpdateProfile({ ...profile, mfaEnabled: true, mfaMethod: 'totp' });
      setMessage({ type: 'success', text: 'Authenticator app two-factor authentication is now enabled.' });
      setStep('idle');
      setCode('');
      setQrDataUrl(null);
      setManualKey('');
      setDisablingFlow(false);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getSubmitErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const body: Record<string, string> = { action: 'disable' };
      if (profile.mfaMethod === 'email') {
        body.emailCode = code;
      } else {
        body.totpCode = code;
      }

      await authedJsonRequest('/api/mfa/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, 'Failed to disable two-factor authentication.');

      onUpdateProfile({ ...profile, mfaEnabled: false, mfaMethod: null });
      setMessage({ type: 'success', text: 'Two-factor authentication has been disabled.' });
      setStep('idle');
      setCode('');
      setDisablingFlow(false);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getSubmitErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('idle');
    setPassword('');
    setCode('');
    setQrDataUrl(null);
    setManualKey('');
    setDisablingFlow(false);
  };

  return (
    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2">
      <div className="flex items-center gap-3 text-blue-500 font-black text-xs uppercase tracking-widest mb-6">
        <ShieldCheck size={20} />
        Two-Factor Authentication
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
          message.type === 'success'
            ? 'bg-sage-green/10 text-sage-green border border-sage-green/20'
            : 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'
        }`}>
          {message.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {step === 'idle' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Add an extra layer of security to your account. Choose email codes or an authenticator app when you log in.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <ShieldCheck size={20} className={profile.mfaEnabled ? 'text-sage-green' : 'text-slate-400'} />
            <div>
              <p className="font-black text-slate-900 dark:text-slate-100">
                {profile.mfaEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {profile.mfaEnabled
                  ? profile.mfaMethod === 'totp'
                    ? 'Authenticator app'
                    : 'Email code'
                  : 'Not protecting your account at login'}
              </p>
            </div>
          </div>
          {profile.mfaEnabled ? (
            <button
              type="button"
              onClick={handleStartDisable}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black hover:opacity-90 transition-all"
            >
              Disable Two-Factor Authentication
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartEnable}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black hover:opacity-90 transition-all"
            >
              Enable Two-Factor Authentication
            </button>
          )}
        </div>
      )}

      {step === 'reauth' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {isGoogleAccount
              ? 'Confirm your identity with Google before changing two-factor authentication settings.'
              : 'Confirm your identity before changing two-factor authentication settings.'}
          </p>
          {!isGoogleAccount && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) void handleReauthSubmit();
              }}
              placeholder="Your password"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-slate-100 outline-none"
            />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReauthSubmit}
              disabled={loading || (!isGoogleAccount && !password)}
              className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Verifying...' : isGoogleAccount ? 'Continue with Google' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              disabled={loading}
              className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'choose-method' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">Choose how you want to verify logins:</p>
          <button
            type="button"
            onClick={handleChooseEmail}
            disabled={loading}
            className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-soft-pink text-left flex items-center gap-4 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={24} className="text-soft-pink animate-spin shrink-0" /> : <Mail size={24} className="text-soft-pink shrink-0" />}
            <div>
              <p className="font-black text-slate-900 dark:text-slate-100">Email code</p>
              <p className="text-xs text-slate-500 font-medium">Receive a 6-digit code by email each login</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleChooseTotp}
            disabled={loading}
            className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-soft-pink text-left flex items-center gap-4 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={24} className="text-soft-pink animate-spin shrink-0" /> : <Smartphone size={24} className="text-soft-pink shrink-0" />}
            <div>
              <p className="font-black text-slate-900 dark:text-slate-100">Authenticator app</p>
              <p className="text-xs text-slate-500 font-medium">Use Google Authenticator, Authy, or similar</p>
            </div>
          </button>
          <button type="button" onClick={resetFlow} disabled={loading} className="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50">
            Cancel
          </button>
        </div>
      )}

      {step === 'email-verify' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Enter the 6-digit code sent to <span className="font-bold text-slate-900 dark:text-slate-100">{accountEmail}</span>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !loading) void handleEnableEmail();
            }}
            placeholder="000000"
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-slate-900 dark:text-slate-100 outline-none"
          />
          <button
            type="button"
            onClick={handleEnableEmail}
            disabled={loading || code.length !== 6}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Enabling...' : 'Enable Email 2FA'}
          </button>
          <button type="button" onClick={resetFlow} disabled={loading} className="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50">
            Cancel
          </button>
        </div>
      )}

      {step === 'totp-setup' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Authenticator QR code" className="mx-auto w-48 h-48 rounded-2xl border border-slate-100 dark:border-slate-700" />
          )}
          {manualKey && (
            <p className="text-xs text-slate-500 font-mono text-center break-all">
              Manual key: {manualKey}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !loading) void handleCompleteTotp();
            }}
            placeholder="000000"
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-slate-900 dark:text-slate-100 outline-none"
          />
          <button
            type="button"
            onClick={handleCompleteTotp}
            disabled={loading || code.length !== 6}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Verifying...' : 'Enable Authenticator 2FA'}
          </button>
          <button type="button" onClick={resetFlow} disabled={loading} className="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50">
            Cancel
          </button>
        </div>
      )}

      {step === 'disable' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {profile.mfaMethod === 'email'
              ? `Enter the code sent to ${accountEmail} to disable two-factor authentication.`
              : 'Enter a code from your authenticator app to disable two-factor authentication.'}
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !loading) void handleDisable();
            }}
            placeholder="000000"
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-slate-900 dark:text-slate-100 outline-none"
          />
          <button
            type="button"
            onClick={handleDisable}
            disabled={loading || code.length !== 6}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Disable Two-Factor Authentication
          </button>
          <button type="button" onClick={resetFlow} disabled={loading} className="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
