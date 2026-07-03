export interface MfaPending {
  uid: string;
  email: string;
  method: 'email' | 'totp';
}

const STORAGE_KEY = 'vs_mfa_pending';

export function getMfaPending(): MfaPending | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MfaPending;
  } catch {
    return null;
  }
}

export function setMfaPending(pending: MfaPending) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function clearMfaPending() {
  sessionStorage.removeItem(STORAGE_KEY);
}
