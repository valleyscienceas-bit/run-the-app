import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Polls `onRefresh` on an interval (skipping while the tab is hidden) and
 * refreshes immediately when the tab becomes visible again.
 */
export function useProgressRefresh(onRefresh: () => void, intervalMs = DEFAULT_INTERVAL_MS): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      onRefreshRef.current();
    };

    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') onRefreshRef.current();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}
