import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeMode, loadThemePreference, saveThemePreference, toggleTheme } from '../lib/theme';
import { auth, db, doc, updateDoc } from '../lib/firebase';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const initial = loadThemePreference();
    setMode(initial);
    saveThemePreference(initial);
  }, []);

  const handleToggle = async () => {
    const next = toggleTheme(mode);
    setMode(next);
    saveThemePreference(next);

    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { theme: next });
      } catch { /* localStorage is enough */ }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center gap-2 rounded-2xl font-bold transition-all ${className}`}
    >
      {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {showLabel && (
        <span className="text-xs font-black uppercase tracking-widest">
          {mode === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
