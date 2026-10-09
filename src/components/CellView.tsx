import { memo, type CSSProperties, type ReactNode } from 'react';
import type { Cell, GameStatus } from '../game';
import { NUMBER_COLORS } from './numberColors';

interface CellViewProps {
  cell: Cell;
  status: GameStatus;
  exploded: boolean;
  tabbable: boolean;
  /** Set when this cell was just revealed: it pops in after this many milliseconds. */
  revealDelay?: number;
}

/**
 * One board cell. It has no event handlers of its own — the board delegates them — so with
 * copy-on-write game state, `memo` skips every cell that didn't change.
 */
export const CellView = memo(function CellView({ cell, status, exploded, tabbable, revealDelay }: CellViewProps) {
  const { row, col, state, isMine, adjacentMines } = cell;
  const wrongFlag = status === 'lost' && state === 'flagged' && !isMine;

  let content: ReactNode = null;
  let label: string;
  let tone: string;

  if (state === 'flagged') {
    content = wrongFlag ? '❌' : '🚩';
    label = wrongFlag ? 'wrongly flagged' : 'flagged';
    tone = wrongFlag ? 'ms-cell-hidden bg-warning/40' : 'ms-cell-hidden bg-base-300';
  } else if (state === 'questioned') {
    content = '?';
    label = 'question mark';
    tone = 'ms-cell-hidden bg-base-300 text-secondary hover:bg-base-content/15';
  } else if (state === 'hidden') {
    label = 'hidden';
    tone = 'ms-cell-hidden bg-base-300 hover:bg-base-content/15';
  } else if (isMine) {
    content = '💣';
    label = exploded ? 'exploded mine' : 'mine';
    // The bomb emoji is dark, so mines get a lighter cell to stay visible on dark themes.
    tone = exploded ? 'bg-error' : 'bg-base-content/30';
  } else {
    content = adjacentMines > 0 ? adjacentMines : null;
    label = adjacentMines > 0 ? `${adjacentMines} adjacent ${adjacentMines === 1 ? 'mine' : 'mines'}` : 'empty';
    tone = `bg-base-100 ${NUMBER_COLORS[adjacentMines]}`;
  }

  const animation = revealDelay === undefined ? '' : exploded ? 'ms-boom' : 'ms-reveal';
  const style = revealDelay ? ({ '--delay': `${revealDelay}ms` } as CSSProperties) : undefined;

  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      tabIndex={tabbable ? 0 : -1}
      aria-label={`Row ${row + 1}, column ${col + 1}: ${label}`}
      className={`ms-cell flex items-center justify-center font-extrabold leading-none outline-offset-[-2px] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary ${tone} ${animation}`}
      style={style}
    >
      {content}
    </button>
  );
});
