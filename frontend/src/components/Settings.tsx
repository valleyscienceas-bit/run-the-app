import React, { useState } from 'react';
import { User, Lock, ShieldCheck, Save, AlertCircle, Trash2 } from 'lucide-react';
import { UserState, UserProfile } from '../types';
import { auth, db, doc, updateDoc, setDoc, deleteUser } from '../lib/firebase';
import { updatePassword, updateProfile } from 'firebase/auth';
import { deleteDoc } from 'firebase/firestore';

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!profile) return;
    if (isParent) {
      setMessage({ type: 'error', text: "Parent accounts are linked to student accounts and cannot be deleted independently. To delete this account, the primary student profile must be deleted." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        
        // 1. Delete linked parent profile if it exists
        if (profile.parentEmail) {
          const parentUid = `parent_${uid}`;
          await deleteDoc(doc(db, 'users', parentUid));
        }

        // 2. Delete Firestore Profile
        await deleteDoc(doc(db, 'users', uid));
        
        // 3. Delete Auth User
        await deleteUser(auth.currentUser);
        
        // 4. Force reload to landing page
        window.location.reload();
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'For security, please log out and log back in before deleting your account.' });
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Are you absolutely sure?</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              This will permanently delete your account, your linked parent account, and all your learning progress. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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

        {/* Danger Zone */}
        <div className="bg-red-50/50 p-10 rounded-[40px] border border-red-100 shadow-xl shadow-red-200/20 lg:col-span-2">
          <div className="flex items-center gap-3 text-red-600 font-black text-xs uppercase tracking-widest mb-8">
            <Trash2 size={20} />
            Danger Zone
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <h3 className="text-xl font-black text-slate-900 mb-2">Delete Account</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Permanently remove your account and all associated data. This includes your XP, test results, and conceptual gap history. This action is irreversible.
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="bg-red-600 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-red-700 transition-all whitespace-nowrap"
            >
              <Trash2 size={20} />
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
