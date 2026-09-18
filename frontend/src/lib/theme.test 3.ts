import { beforeEach, describe, expect, it } from 'vitest';
import { loadThemePreference, toggleTheme } from './theme';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  (globalThis as any).window = {
    matchMedia: (query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };
});

describe('toggleTheme', () => {
  it('switches light and dark', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});

describe('loadThemePreference', () => {
  it('prefers profile theme when set', () => {
    store.set('vs-theme', 'dark');
    expect(loadThemePreference({ theme: 'light' } as any)).toBe('light');
    expect(loadThemePreference({ theme: 'dark' } as any)).toBe('dark');
  });

  it('falls back to localStorage', () => {
    store.set('vs-theme', 'dark');
    expect(loadThemePreference(null)).toBe('dark');
  });

  it('falls back to system preference', () => {
    expect(loadThemePreference(null)).toBe('dark');
  });
});
