import React, { useState } from 'react';
import { User, Lock, ShieldCheck, Save, AlertCircle, ShieldHalf, UserCircle } from 'lucide-react';
import { UserState, UserProfile } from '../types';
import { auth, db, doc, updateDoc } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';

interface SettingsProps {
  userState: UserState;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
}

export function Settings({ userState, onUpdateProfile }: SettingsProps) {
  const profile = userState.profile;
  const isIndividual = userState.path === 'individual';
  const isParent = userState.role === 'parent';
  
  const [username, setUsername] = useState(profile?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdateUsername = async () => {
    if (!isIndividual) return;
    setLoading(true);
    setMessage(null);
    try {
      const userRef = doc(db, 'users', userState.profile!.uid);
      await updateDoc(userRef, { username });
      
      const updatedProfile = { ...userState.profile!, username };
      onUpdateProfile(updatedProfile);
      setMessage({ type: 'success', text: 'Username updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Settings</h1>
        <p className="text-xl text-slate-600 font-medium">Manage your account and security.</p>
      </header>

      {message && (
        <div className={`p-6 rounded-[32px] border flex items-center gap-4 ${
          message.type === 'success' ? 'bg-sage-green/10 border-sage-green/20 text-sage-green' : 'bg-red-50 border-red-100 text-red-600'
        }`}>
          {message.type === 'success' ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Profile Settings */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 text-soft-pink font-black text-xs uppercase tracking-widest mb-8">
            <User size={20} />
            Profile Information
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-slate-400 cursor-not-allowed">
                {profile?.email}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 ml-1 font-bold italic">Email cannot be changed for security.</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={!isIndividual || isParent || loading}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {(!isIndividual || isParent) && (
                <p className="text-[10px] text-soft-pink mt-2 ml-1 font-bold">
                  {isParent ? "Parent usernames are automatically generated." : "Username is managed by your district."}
                </p>
              )}
            </div>

            {isIndividual && !isParent && (
              <button 
                onClick={handleUpdateUsername}
                disabled={loading || username === profile?.username}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                <Save size={20} />
                Update Username
              </button>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 text-sage-green font-black text-xs uppercase tracking-widest mb-8">
            <Lock size={20} />
            Security & Password
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
              <input 
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
              />
            </div>

            <button 
              onClick={handleUpdatePassword}
              disabled={loading || !newPassword}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              <ShieldCheck size={20} />
              Change Password
            </button>
          </div>
        </div>

        {/* Account Management */}
        {isParent ? (
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 lg:col-span-2">
            <div className="flex items-center gap-3 text-soft-pink font-black text-xs uppercase tracking-widest mb-8">
              <UserCircle size={20} />
              Account Management
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <h3 className="text-xl font-black text-slate-900 mb-2">Manage Student Account</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Your student's account details and account deletion are available on the
                  <span className="font-black text-slate-900"> Student Account </span>
                  page in the sidebar. Deleting the student account also removes this parent account.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-sage-green/5 p-10 rounded-[40px] border border-sage-green/20 shadow-xl shadow-slate-200/20 lg:col-span-2">
            <div className="flex items-center gap-3 text-sage-green font-black text-xs uppercase tracking-widest mb-6">
              <ShieldHalf size={20} />
              Account Management
            </div>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-sage-green/10 rounded-2xl flex items-center justify-center text-sage-green shrink-0">
                <ShieldHalf size={24} />
              </div>
              <div className="max-w-2xl">
                <h3 className="text-xl font-black text-slate-900 mb-2">Your account is managed by your parent or guardian</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  For your safety, only your parent or guardian can delete this account. If you need to make changes,
                  please ask them to manage it from their parent dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
