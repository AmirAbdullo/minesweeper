/**
 * `questioned` is the optional "?" mark: the cell is still covered (it can be revealed and is
 * opened by flood fill) but, unlike a flag, it doesn't count toward the mine counter.
 */
export type CellState = 'hidden' | 'revealed' | 'flagged' | 'questioned';

export interface Position {
  row: number;
  col: number;
}

export interface Cell extends Position {
  isMine: boolean;
  /** Number of mines in the eight surrounding cells. */
  adjacentMines: number;
  state: CellState;
}

export interface BoardConfig {
  rows: number;
  cols: number;
  mines: number;
}

export interface Board {
  rows: number;
  cols: number;
  mineCount: number;
  /** Mines are placed lazily on the first reveal so the first click can be kept safe. */
  minesPlaced: boolean;
  cells: Cell[][];
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface GameState {
  board: Board;
  status: GameStatus;
  /** The mine that ended the game, when it was lost. */
  explodedAt: Position | null;
}

/** Returns a float in [0, 1), like Math.random. Injectable so tests are deterministic. */
export type Rng = () => number;

export interface MarkOptions {
  /** When true, marking cycles flagged → question mark → blank instead of flagged → blank. */
  questionMarks?: boolean;
}

export interface RevealOptions {
  /** When true (default), the first revealed cell and, if room allows, its neighbours are never mines. */
  safeFirstClick?: boolean;
  rng?: Rng;
}
