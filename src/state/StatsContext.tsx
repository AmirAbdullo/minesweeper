import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createStats, recordGame, sanitizeStats, type GameResult, type Stats } from '../game';

export const STATS_STORAGE_KEY = 'minesweeper:stats';

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    return raw ? sanitizeStats(JSON.parse(raw)) : createStats();
  } catch {
    return createStats();
  }
}

function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable: stats last for this visit only.
  }
}

interface StatsContextValue {
  stats: Stats;
  recordResult: (result: GameResult) => void;
  resetStats: () => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(loadStats);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  const recordResult = useCallback((result: GameResult) => setStats((prev) => recordGame(prev, result)), []);
  const resetStats = useCallback(() => setStats(createStats()), []);

  const value = useMemo(() => ({ stats, recordResult, resetStats }), [stats, recordResult, resetStats]);
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used inside <StatsProvider>');
  return ctx;
}
