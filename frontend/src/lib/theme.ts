import { UserProfile } from '../types';

export type ThemeMode = 'light' | 'dark';

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function loadThemePreference(profile?: UserProfile | null): ThemeMode {
  if (profile?.theme === 'light' || profile?.theme === 'dark') return profile.theme;
  const stored = localStorage.getItem('vs-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function saveThemePreference(mode: ThemeMode) {
  localStorage.setItem('vs-theme', mode);
  applyTheme(mode);
}

export function toggleTheme(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}
