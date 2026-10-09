import type {
  Board,
  BoardConfig,
  Cell,
  CellState,
  GameState,
  GameStatus,
  MarkOptions,
  Position,
  RevealOptions,
  Rng,
} from './types';

const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function isInBounds(board: Pick<Board, 'rows' | 'cols'>, row: number, col: number): boolean {
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols;
}

/** Positions of the (up to eight) cells surrounding `row`/`col`. */
export function getNeighbors(rows: number, cols: number, row: number, col: number): Position[] {
  const result: Position[] = [];
  for (const [dr, dc] of NEIGHBOR_OFFSETS) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < rows && c >= 0 && c < cols) result.push({ row: r, col: c });
  }
  return result;
}

export function getCell(board: Board, pos: Position): Cell | undefined {
  return board.cells[pos.row]?.[pos.col];
}

/** Hidden or question-marked: covered cells that a reveal or flood fill may open. Flags protect a cell. */
export function isCovered(cell: Cell): boolean {
  return cell.state === 'hidden' || cell.state === 'questioned';
}

/** The mark a covered cell gets next when the player right-clicks / long-presses it. */
export function nextMark(state: CellState, { questionMarks = false }: MarkOptions = {}): CellState {
  switch (state) {
    case 'hidden':
      return 'flagged';
    case 'flagged':
      return questionMarks ? 'questioned' : 'hidden';
    case 'questioned':
      return 'hidden';
    case 'revealed':
      return 'revealed';
  }
}

/** An empty board: every cell hidden, mines not yet placed. */
export function createBoard({ rows, cols, mines }: BoardConfig): Board {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new RangeError(`Invalid board size ${rows}x${cols}`);
  }
  if (!Number.isInteger(mines) || mines < 0 || mines >= rows * cols) {
    throw new RangeError(`Mine count must be between 0 and ${rows * cols - 1}`);
  }
  const cells = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col): Cell => ({
      row,
      col,
      isMine: false,
      adjacentMines: 0,
      state: 'hidden',
    })),
  );
  return { rows, cols, mineCount: mines, minesPlaced: false, cells };
}

/** Returns a copy of `board` with mines at the given flat indexes and adjacency counts filled in. */
function withMines(board: Board, mineIndexes: Set<number>): Board {
  const { rows, cols } = board;
  const isMine = (row: number, col: number) => mineIndexes.has(row * cols + col);
  const cells = board.cells.map((rowCells) =>
    rowCells.map((cell) => ({
      ...cell,
      isMine: isMine(cell.row, cell.col),
      adjacentMines: getNeighbors(rows, cols, cell.row, cell.col).filter((n) => isMine(n.row, n.col)).length,
    })),
  );
  return { ...board, mineCount: mineIndexes.size, minesPlaced: true, cells };
}

/**
 * Randomly places `board.mineCount` mines. When `safe` is given, that cell never gets a mine, and
 * neither do its neighbours as long as enough other cells remain — so the first click opens an area.
 */
export function placeMines(board: Board, safe: Position | null = null, rng: Rng = Math.random): Board {
  const { rows, cols, mineCount } = board;
  const total = rows * cols;
  const toIndex = (p: Position) => p.row * cols + p.col;

  let excluded = new Set<number>();
  if (safe && isInBounds(board, safe.row, safe.col)) {
    const zone = [safe, ...getNeighbors(rows, cols, safe.row, safe.col)].map(toIndex);
    excluded = new Set(total - zone.length >= mineCount ? zone : [toIndex(safe)]);
  }

  const candidates: number[] = [];
  for (let i = 0; i < total; i++) if (!excluded.has(i)) candidates.push(i);
  if (mineCount > candidates.length) throw new RangeError('Not enough free cells to place the mines');

  // Partial Fisher–Yates shuffle: the first `mineCount` candidates become mines.
  for (let i = 0; i < mineCount; i++) {
    const j = i + Math.floor(rng() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return withMines(board, new Set(candidates.slice(0, mineCount)));
}

/** Builds a board with mines at fixed positions. Handy for tests and puzzles. */
export function createBoardFromMines(rows: number, cols: number, mines: Position[]): Board {
  const board = createBoard({ rows, cols, mines: 0 });
  return withMines(board, new Set(mines.map((m) => m.row * cols + m.col)));
}

export function newGame(config: BoardConfig): GameState {
  return { board: createBoard(config), status: 'idle', explodedAt: null };
}

export function isGameOver(state: GameState): boolean {
  return state.status === 'won' || state.status === 'lost';
}

export function countFlags(board: Board): number {
  let flags = 0;
  for (const row of board.cells) for (const cell of row) if (cell.state === 'flagged') flags++;
  return flags;
}

/** Total mines minus flags placed. Can go negative if the player over-flags. */
export function remainingMines(board: Board): number {
  return board.mineCount - countFlags(board);
}

/** Won when every non-mine cell has been revealed. */
export function isWon(board: Board): boolean {
  if (!board.minesPlaced) return false;
  return board.cells.every((row) => row.every((cell) => cell.isMine || cell.state === 'revealed'));
}

/** Lost when any mine has been revealed. */
export function isLost(board: Board): boolean {
  return board.cells.some((row) => row.some((cell) => cell.isMine && cell.state === 'revealed'));
}

export function checkGameStatus(board: Board): GameStatus {
  if (isLost(board)) return 'lost';
  if (isWon(board)) return 'won';
  const anyRevealed = board.cells.some((row) => row.some((cell) => cell.state === 'revealed'));
  return anyRevealed ? 'playing' : 'idle';
}

// Updates are copy-on-write: rows are copied, and only cells that change get new objects, so
// unchanged cells keep their identity (which lets the UI skip re-rendering them).
function copyRows(cells: Cell[][]): Cell[][] {
  return cells.map((row) => row.slice());
}

function floodReveal(board: Board, cells: Cell[][], start: Position): void {
  const stack: Position[] = [start];
  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    const cell = cells[row][col];
    if (!isCovered(cell) || cell.isMine) continue;
    cells[row][col] = { ...cell, state: 'revealed' };
    if (cell.adjacentMines === 0) {
      for (const n of getNeighbors(board.rows, board.cols, row, col)) {
        if (isCovered(cells[n.row][n.col])) stack.push(n);
      }
    }
  }
}

/** Sets every still-covered mine to `to`. Flagged mines are left as they are. */
function mapCoveredMines(cells: Cell[][], to: 'revealed' | 'flagged'): void {
  for (const row of cells) {
    for (let c = 0; c < row.length; c++) {
      if (row[c].isMine && isCovered(row[c])) row[c] = { ...row[c], state: to };
    }
  }
}

/** Opens each hidden target (flood-filling zeros) and works out the resulting status. */
function openCells(board: Board, targets: Position[]): GameState {
  const cells = copyRows(board.cells);
  let explodedAt: Position | null = null;

  for (const pos of targets) {
    const cell = cells[pos.row][pos.col];
    if (!isCovered(cell)) continue;
    if (cell.isMine) {
      explodedAt ??= pos;
      cells[pos.row][pos.col] = { ...cell, state: 'revealed' };
    } else {
      floodReveal(board, cells, pos);
    }
  }

  if (explodedAt) {
    // Show every mine; correctly placed flags stay as flags.
    mapCoveredMines(cells, 'revealed');
    return { board: { ...board, cells }, status: 'lost', explodedAt };
  }

  const next: Board = { ...board, cells };
  if (isWon(next)) {
    // Classic behaviour: on a win, the remaining mines are flagged for you.
    mapCoveredMines(cells, 'flagged');
    return { board: next, status: 'won', explodedAt: null };
  }
  return { board: next, status: 'playing', explodedAt: null };
}

/**
 * Reveals a covered cell (hidden or question-marked). The first reveal places the mines (avoiding
 * this cell when `safeFirstClick` is on). Revealing a mine loses; revealing a zero flood-fills its
 * neighbours. Flagged or already revealed cells are left alone.
 */
export function revealCell(state: GameState, pos: Position, options: RevealOptions = {}): GameState {
  const { safeFirstClick = true, rng = Math.random } = options;
  if (isGameOver(state)) return state;
  const cell = getCell(state.board, pos);
  if (!cell || !isCovered(cell)) return state;

  const board = state.board.minesPlaced
    ? state.board
    : placeMines(state.board, safeFirstClick ? pos : null, rng);
  return openCells(board, [pos]);
}

/**
 * "Chording": on a revealed number whose surrounding flags equal that number, reveal every other
 * hidden neighbour at once. If a flag was wrong, this can hit a mine.
 */
export function chordCell(state: GameState, pos: Position): GameState {
  if (isGameOver(state)) return state;
  const { board } = state;
  const cell = getCell(board, pos);
  if (!cell || cell.state !== 'revealed' || cell.adjacentMines === 0) return state;

  const neighbors = getNeighbors(board.rows, board.cols, pos.row, pos.col);
  const flags = neighbors.filter((n) => board.cells[n.row][n.col].state === 'flagged').length;
  if (flags !== cell.adjacentMines) return state;

  // Question marks are not flags: they don't count above and get opened along with hidden cells.
  const covered = neighbors.filter((n) => isCovered(board.cells[n.row][n.col]));
  return covered.length > 0 ? openCells(board, covered) : state;
}

/**
 * Moves a covered cell to its next mark: hidden → flagged → hidden, or, with `questionMarks`,
 * hidden → flagged → question mark → hidden. Revealed cells can't be marked.
 */
export function toggleFlag(state: GameState, pos: Position, options: MarkOptions = {}): GameState {
  if (isGameOver(state)) return state;
  const cell = getCell(state.board, pos);
  if (!cell || cell.state === 'revealed') return state;

  const cells = copyRows(state.board.cells);
  cells[pos.row][pos.col] = { ...cell, state: nextMark(cell.state, options) };
  return { ...state, board: { ...state.board, cells } };
}
