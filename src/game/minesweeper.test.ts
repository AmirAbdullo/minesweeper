import { describe, expect, it } from 'vitest';
import {
  checkGameStatus,
  chordCell,
  countFlags,
  createBoard,
  createBoardFromMines,
  newGame,
  nextMark,
  placeMines,
  remainingMines,
  revealCell,
  toggleFlag,
  validateCustomConfig,
  type Board,
  type GameState,
  type Rng,
} from './index';

/** Small seeded PRNG (mulberry32) so random placement is reproducible. */
function seeded(seed: number): Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stateOf(board: Board): GameState {
  return { board, status: 'idle', explodedAt: null };
}

function mineCount(board: Board): number {
  return board.cells.flat().filter((c) => c.isMine).length;
}

function revealedCount(board: Board): number {
  return board.cells.flat().filter((c) => c.state === 'revealed').length;
}

describe('createBoard', () => {
  it('creates a hidden board of the requested size with no mines yet', () => {
    const board = createBoard({ rows: 9, cols: 12, mines: 10 });
    expect(board.cells).toHaveLength(9);
    expect(board.cells.every((row) => row.length === 12)).toBe(true);
    expect(board.cells.flat().every((c) => c.state === 'hidden' && !c.isMine)).toBe(true);
    expect(board.minesPlaced).toBe(false);
    expect(board.mineCount).toBe(10);
  });

  it('rejects boards with too many mines', () => {
    expect(() => createBoard({ rows: 3, cols: 3, mines: 9 })).toThrow(RangeError);
  });
});

describe('placeMines', () => {
  it('places exactly the requested number of mines, never on or around the safe cell', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const safe = { row: seed % 9, col: (seed * 7) % 9 };
      const board = placeMines(createBoard({ rows: 9, cols: 9, mines: 10 }), safe, seeded(seed));
      expect(mineCount(board)).toBe(10);
      expect(board.cells[safe.row][safe.col].isMine).toBe(false);
      expect(board.cells[safe.row][safe.col].adjacentMines).toBe(0);
    }
  });

  it('falls back to protecting only the clicked cell when the board is crowded', () => {
    const board = placeMines(createBoard({ rows: 3, cols: 3, mines: 8 }), { row: 1, col: 1 }, seeded(42));
    expect(board.cells[1][1].isMine).toBe(false);
    expect(mineCount(board)).toBe(8);
    expect(board.cells[1][1].adjacentMines).toBe(8);
  });

  it('computes adjacent mine counts', () => {
    // * . *
    // . . .
    // . . .
    const board = createBoardFromMines(3, 3, [{ row: 0, col: 0 }, { row: 0, col: 2 }]);
    expect(board.cells[0][1].adjacentMines).toBe(2);
    expect(board.cells[1][1].adjacentMines).toBe(2);
    expect(board.cells[1][0].adjacentMines).toBe(1);
    expect(board.cells[2][1].adjacentMines).toBe(0);
  });
});

describe('revealCell', () => {
  it('never loses on the first click when safe first click is on', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const game = revealCell(newGame({ rows: 9, cols: 9, mines: 70 }), { row: 4, col: 4 }, {
        safeFirstClick: true,
        rng: seeded(seed),
      });
      expect(game.status).not.toBe('lost');
    }
  });

  it('reveals only the clicked cell when it has a number', () => {
    const board = createBoardFromMines(3, 3, [{ row: 0, col: 0 }]);
    const game = revealCell(stateOf(board), { row: 1, col: 1 });
    expect(game.board.cells[1][1].state).toBe('revealed');
    expect(revealedCount(game.board)).toBe(1);
    expect(game.status).toBe('playing');
  });

  it('flood-fills from a zero up to the numbered border', () => {
    // A wall of mines in column 3 of a 5x5 board.
    const wall = [0, 1, 2, 3, 4].map((row) => ({ row, col: 3 }));
    const game = revealCell(stateOf(createBoardFromMines(5, 5, wall)), { row: 2, col: 0 });
    const { cells } = game.board;
    for (let r = 0; r < 5; r++) {
      expect([cells[r][0].state, cells[r][1].state, cells[r][2].state]).toEqual(['revealed', 'revealed', 'revealed']);
      expect(cells[r][4].state).toBe('hidden');
    }
    expect(cells[0][2].adjacentMines).toBe(2);
    expect(cells[2][2].adjacentMines).toBe(3);
    expect(game.status).toBe('playing');
  });

  it('loses when a mine is revealed and shows all mines', () => {
    const mines = [{ row: 0, col: 0 }, { row: 2, col: 2 }];
    const game = revealCell(stateOf(createBoardFromMines(3, 3, mines)), { row: 0, col: 0 });
    expect(game.status).toBe('lost');
    expect(game.explodedAt).toEqual({ row: 0, col: 0 });
    expect(game.board.cells[2][2].state).toBe('revealed');
    // Further moves are ignored once the game is over.
    expect(revealCell(game, { row: 1, col: 1 })).toBe(game);
  });

  it('does not reveal flagged cells', () => {
    const flagged = toggleFlag(stateOf(createBoardFromMines(3, 3, [{ row: 0, col: 0 }])), { row: 0, col: 0 });
    expect(revealCell(flagged, { row: 0, col: 0 })).toBe(flagged);
  });
});

describe('toggleFlag', () => {
  it('toggles a flag and updates the remaining mine counter', () => {
    const start = stateOf(createBoardFromMines(3, 3, [{ row: 0, col: 0 }, { row: 2, col: 2 }]));
    expect(remainingMines(start.board)).toBe(2);
    const flagged = toggleFlag(start, { row: 1, col: 1 });
    expect(flagged.board.cells[1][1].state).toBe('flagged');
    expect(remainingMines(flagged.board)).toBe(1);
    const unflagged = toggleFlag(flagged, { row: 1, col: 1 });
    expect(unflagged.board.cells[1][1].state).toBe('hidden');
    expect(remainingMines(unflagged.board)).toBe(2);
  });

  it('cannot flag a revealed cell', () => {
    const revealed = revealCell(stateOf(createBoardFromMines(3, 3, [{ row: 0, col: 0 }])), { row: 1, col: 1 });
    expect(toggleFlag(revealed, { row: 1, col: 1 })).toBe(revealed);
  });
});

describe('question marks', () => {
  const pos = { row: 1, col: 1 };
  const twoMines = () => stateOf(createBoardFromMines(3, 3, [{ row: 0, col: 0 }, { row: 2, col: 2 }]));

  it('nextMark cycles flagged → question mark → blank only when enabled', () => {
    expect(nextMark('hidden', { questionMarks: true })).toBe('flagged');
    expect(nextMark('flagged', { questionMarks: true })).toBe('questioned');
    expect(nextMark('questioned', { questionMarks: true })).toBe('hidden');
    expect(nextMark('flagged', { questionMarks: false })).toBe('hidden');
    expect(nextMark('revealed', { questionMarks: true })).toBe('revealed');
  });

  it('cycles a cell through all three marks with toggleFlag', () => {
    let game = twoMines();
    const states: string[] = [];
    for (let i = 0; i < 3; i++) {
      game = toggleFlag(game, pos, { questionMarks: true });
      states.push(game.board.cells[1][1].state);
    }
    expect(states).toEqual(['flagged', 'questioned', 'hidden']);
  });

  it('clears a leftover question mark even after the option is turned off', () => {
    const questioned = toggleFlag(toggleFlag(twoMines(), pos), pos, { questionMarks: true });
    expect(questioned.board.cells[1][1].state).toBe('questioned');
    expect(toggleFlag(questioned, pos, { questionMarks: false }).board.cells[1][1].state).toBe('hidden');
  });

  it('does not count question marks toward the mine counter', () => {
    let game = twoMines();
    game = toggleFlag(game, { row: 0, col: 0 }, { questionMarks: true }); // flagged
    game = toggleFlag(game, { row: 0, col: 1 }, { questionMarks: true }); // flagged
    game = toggleFlag(game, { row: 0, col: 1 }, { questionMarks: true }); // → question mark
    expect(countFlags(game.board)).toBe(1);
    expect(remainingMines(game.board)).toBe(1);
  });

  it('lets a question-marked cell be revealed, and flood fill opens question marks', () => {
    const wall = [0, 1, 2, 3, 4].map((row) => ({ row, col: 3 }));
    let game = stateOf(createBoardFromMines(5, 5, wall));
    game = toggleFlag(game, { row: 4, col: 0 }, { questionMarks: true });
    game = toggleFlag(game, { row: 4, col: 0 }, { questionMarks: true });
    expect(game.board.cells[4][0].state).toBe('questioned');
    game = revealCell(game, { row: 0, col: 0 });
    expect(game.board.cells[4][0].state).toBe('revealed');

    const single = toggleFlag(toggleFlag(twoMines(), pos, { questionMarks: true }), pos, { questionMarks: true });
    expect(revealCell(single, pos).board.cells[1][1].state).toBe('revealed');
  });

  it('treats question marks as unflagged when chording', () => {
    // (1,1) shows 1; a question mark on its mine is not enough to chord.
    let game = revealCell(stateOf(createBoardFromMines(3, 4, [{ row: 0, col: 0 }])), { row: 1, col: 1 });
    game = toggleFlag(game, { row: 0, col: 0 }, { questionMarks: true });
    game = toggleFlag(game, { row: 0, col: 0 }, { questionMarks: true });
    expect(chordCell(game, { row: 1, col: 1 })).toBe(game);
  });

  it('reveals question-marked mines on a loss and flags them on a win', () => {
    let lost = toggleFlag(toggleFlag(twoMines(), { row: 2, col: 2 }, { questionMarks: true }), { row: 2, col: 2 }, {
      questionMarks: true,
    });
    lost = revealCell(lost, { row: 0, col: 0 });
    expect(lost.status).toBe('lost');
    expect(lost.board.cells[2][2].state).toBe('revealed');

    let won = stateOf(createBoardFromMines(2, 2, [{ row: 0, col: 0 }]));
    won = toggleFlag(toggleFlag(won, { row: 0, col: 0 }, { questionMarks: true }), { row: 0, col: 0 }, { questionMarks: true });
    for (const p of [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }]) won = revealCell(won, p);
    expect(won.status).toBe('won');
    expect(won.board.cells[0][0].state).toBe('flagged');
  });
});

describe('winning', () => {
  it('wins once every safe cell is revealed and flags the remaining mines', () => {
    let game = stateOf(createBoardFromMines(2, 2, [{ row: 0, col: 0 }]));
    game = revealCell(game, { row: 0, col: 1 });
    game = revealCell(game, { row: 1, col: 0 });
    expect(game.status).toBe('playing');
    game = revealCell(game, { row: 1, col: 1 });
    expect(game.status).toBe('won');
    expect(checkGameStatus(game.board)).toBe('won');
    expect(game.board.cells[0][0].state).toBe('flagged');
    expect(remainingMines(game.board)).toBe(0);
  });

  it('reports idle, playing and lost statuses', () => {
    const board = createBoardFromMines(3, 3, [{ row: 0, col: 0 }]);
    expect(checkGameStatus(board)).toBe('idle');
    expect(checkGameStatus(revealCell(stateOf(board), { row: 1, col: 1 }).board)).toBe('playing');
    expect(checkGameStatus(revealCell(stateOf(board), { row: 0, col: 0 }).board)).toBe('lost');
  });
});

describe('chordCell', () => {
  it('reveals the other neighbours when the flags match the number', () => {
    // * . .
    // . . .
    // . . .   (mine in the corner; (1,1) shows 1)
    let game = revealCell(stateOf(createBoardFromMines(3, 4, [{ row: 0, col: 0 }])), { row: 1, col: 1 });
    expect(chordCell(game, { row: 1, col: 1 })).toBe(game); // no flag yet → nothing happens
    game = toggleFlag(game, { row: 0, col: 0 });
    game = chordCell(game, { row: 1, col: 1 });
    expect(game.status).toBe('won');
  });

  it('loses when a flag was placed on the wrong cell', () => {
    let game = revealCell(stateOf(createBoardFromMines(3, 3, [{ row: 0, col: 0 }])), { row: 1, col: 1 });
    game = toggleFlag(game, { row: 2, col: 2 });
    game = chordCell(game, { row: 1, col: 1 });
    expect(game.status).toBe('lost');
    expect(game.explodedAt).toEqual({ row: 0, col: 0 });
  });
});

describe('validateCustomConfig', () => {
  it('accepts valid boards and rejects out-of-range values', () => {
    expect(validateCustomConfig({ rows: 10, cols: 10, mines: 20 })).toEqual({});
    expect(validateCustomConfig({ rows: 2, cols: 10, mines: 5 }).rows).toBeDefined();
    expect(validateCustomConfig({ rows: 5, cols: 5, mines: 25 }).mines).toBeDefined();
  });
});
