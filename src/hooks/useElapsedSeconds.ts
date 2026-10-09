import { useEffect, useState } from 'react';

/** Whole seconds between `startedAt` and `endedAt` (or now, while running). 0 before the game starts. */
export function useElapsedSeconds(startedAt: number | null, endedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null || endedAt !== null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  if (startedAt === null) return 0;
  return Math.max(0, Math.floor(((endedAt ?? now) - startedAt) / 1000));
}
