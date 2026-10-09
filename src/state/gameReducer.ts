import {
  chordCell,
  isGameOver,
  newGame,
  revealCell,
  toggleFlag,
  type BoardConfig,
  type GameState,
  type Position,
} from '../game';

/** A game plus the bits the UI needs around it: board config, stats key and timer timestamps. */
export interface GameSession {
  game: GameState;
  config: BoardConfig;
  /** Which stats entry this game's result goes to (see `statsKeyFor`). */
  statsKey: string;
  /** Set on the first reveal — the timer starts on the first click. */
  startedAt: number | null;
  endedAt: number | null;
}

export type GameAction =
  | { type: 'reveal'; pos: Position; safeFirstClick: boolean; now: number }
  | { type: 'chord'; pos: Position; now: number }
  | { type: 'flag'; pos: Position; questionMarks: boolean }
  | { type: 'reset' }
  | { type: 'configure'; config: BoardConfig; statsKey: string };

export function createSession({ config, statsKey }: { config: BoardConfig; statsKey: string }): GameSession {
  return { game: newGame(config), config, statsKey, startedAt: null, endedAt: null };
}

function sameConfig(a: BoardConfig, b: BoardConfig): boolean {
  return a.rows === b.rows && a.cols === b.cols && a.mines === b.mines;
}

function advance(session: GameSession, game: GameState, now: number): GameSession {
  if (game === session.game) return session;
  return {
    ...session,
    game,
    startedAt: session.startedAt ?? (game.status === 'idle' ? null : now),
    endedAt: isGameOver(game) ? (session.endedAt ?? now) : null,
  };
}

export function gameReducer(session: GameSession, action: GameAction): GameSession {
  switch (action.type) {
    case 'reveal':
      return advance(
        session,
        revealCell(session.game, action.pos, { safeFirstClick: action.safeFirstClick }),
        action.now,
      );
    case 'chord':
      return advance(session, chordCell(session.game, action.pos), action.now);
    case 'flag':
      return { ...session, game: toggleFlag(session.game, action.pos, { questionMarks: action.questionMarks }) };
    case 'reset':
      return createSession(session);
    case 'configure':
      return sameConfig(session.config, action.config) && session.statsKey === action.statsKey
        ? session
        : createSession(action);
  }
}
