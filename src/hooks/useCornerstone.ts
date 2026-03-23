import { useEffect, useState } from 'react';
import { initCornerstone } from '../core/cornerstoneSetup';
import { setupTools } from '../core/toolSetup';

export function useCornerstone(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await initCornerstone();
        setupTools();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Cornerstone init failed',
          );
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
