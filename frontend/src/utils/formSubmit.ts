export function getSubmitErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  const isNetworkError =
    !message || /failed to fetch|networkerror|load failed/i.test(message);
  if (isNetworkError) {
    return 'Could not reach the server. Make sure the backend is running (port 3001).';
  }
  return message || 'Something went wrong. Please try again.';
}

export async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}
