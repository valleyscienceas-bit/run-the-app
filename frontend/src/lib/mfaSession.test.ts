import { beforeEach, describe, expect, it } from 'vitest';
import { clearMfaPending, getMfaPending, setMfaPending } from './mfaSession';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
});

describe('mfaSession', () => {
  it('starts empty', () => {
    expect(getMfaPending()).toBeNull();
  });

  it('stores and reads pending MFA', () => {
    setMfaPending({ uid: 'u1', email: 'a@b.com', method: 'email' });
    expect(getMfaPending()).toEqual({ uid: 'u1', email: 'a@b.com', method: 'email' });
  });

  it('clears pending MFA so auth can complete', () => {
    setMfaPending({ uid: 'u1', email: 'a@b.com', method: 'totp' });
    clearMfaPending();
    expect(getMfaPending()).toBeNull();
  });

  it('returns null for corrupt storage', () => {
    store.set('vs_mfa_pending', '{not-json');
    expect(getMfaPending()).toBeNull();
  });
});
