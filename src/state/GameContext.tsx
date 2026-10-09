import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { statsKeyFor, type Position } from '../game';
import { createSession, gameReducer, type GameSession } from './gameReducer';
import { useSettings } from './SettingsContext';
import { useStats } from './StatsContext';

interface GameContextValue {
  session: GameSession;
  reveal: (pos: Position) => void;
  chord: (pos: Position) => void;
  /** Cycles the cell's mark (flag, then question mark if enabled, then blank). */
  flag: (pos: Position) => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { settings, boardConfig } = useSettings();
  const { recordResult } = useStats();
  const statsKey = statsKeyFor(settings.difficulty, boardConfig);
  const [session, dispatch] = useReducer(gameReducer, { config: boardConfig, statsKey }, createSession);

  // A new board size or mine count starts a fresh game. The game itself survives page navigation.
  const { rows, cols, mines } = boardConfig;
  useEffect(() => {
    dispatch({ type: 'configure', config: { rows, cols, mines }, statsKey });
  }, [rows, cols, mines, statsKey]);

  // Record each finished game exactly once. A game that is abandoned (new game mid-way) isn't counted.
  const recordedEndRef = useRef<number | null>(null);
  const { status } = session.game;
  useEffect(() => {
    const { startedAt, endedAt } = session;
    if (startedAt === null || endedAt === null || recordedEndRef.current === endedAt) return;
    if (status !== 'won' && status !== 'lost') return;
    recordedEndRef.current = endedAt;
    recordResult({ key: session.statsKey, won: status === 'won', durationMs: endedAt - startedAt });
  }, [session, status, recordResult]);

  const { safeFirstClick, questionMarks } = settings;
  const reveal = useCallback(
    (pos: Position) => dispatch({ type: 'reveal', pos, safeFirstClick, now: Date.now() }),
    [safeFirstClick],
  );
  const chord = useCallback((pos: Position) => dispatch({ type: 'chord', pos, now: Date.now() }), []);
  const flag = useCallback((pos: Position) => dispatch({ type: 'flag', pos, questionMarks }), [questionMarks]);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo(
    () => ({ session, reveal, chord, flag, reset }),
    [session, reveal, chord, flag, reset],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
