import { auth } from './firebase';

/** Build JSON + Firebase Bearer headers for authenticated API calls. */
export async function authJsonHeaders(forceRefresh = false): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You need to be signed in.');
  }
  const idToken = await user.getIdToken(forceRefresh);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

const SANDBOX_TOKEN_KEY = 'vs-auth-token';

/** Stash ID token so standalone /sandbox HTML labs can call /api/chat (same origin). */
export async function stashAuthTokenForSandbox(forceRefresh = false): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const idToken = await user.getIdToken(forceRefresh);
    // localStorage (not sessionStorage) so a new tab opened via window.open can read it
    localStorage.setItem(SANDBOX_TOKEN_KEY, idToken);
  } catch {
    /* ignore */
  }
}

export function openSandboxLab(path: string): void {
  void stashAuthTokenForSandbox().then(() => {
    window.open(path, '_blank', 'noopener,noreferrer');
  });
}
