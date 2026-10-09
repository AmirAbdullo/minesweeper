import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
} from 'react';
import type { Board as BoardModel, Position } from '../game';
import { unlockAudio } from '../audio/sounds';
import { useGame } from '../state/GameContext';
import { useSettings } from '../state/SettingsContext';
import { CellView } from './CellView';

const LONG_PRESS_MS = 400;
const LONG_PRESS_MOVE_TOLERANCE = 10;
/** Flood-fill animation: each ring of cells further from the click starts this much later... */
const REVEAL_STEP_MS = 22;
/** ...up to this cap, so big openings on Expert still finish quickly. */
const REVEAL_MAX_DELAY_MS = 450;

/**
 * Cells revealed between two boards, mapped (by flat index) to an animation delay that grows
 * with their distance from `origin`, so a flood fill ripples outward from where the player clicked.
 */
function revealDelaysBetween(prev: BoardModel, next: BoardModel, origin: Position): Map<number, number> {
  const delays = new Map<number, number>();
  if (prev === next || prev.rows !== next.rows || prev.cols !== next.cols) return delays;
  for (let r = 0; r < next.rows; r++) {
    for (let c = 0; c < next.cols; c++) {
      if (next.cells[r][c].state === 'revealed' && prev.cells[r][c].state !== 'revealed') {
        const ring = Math.max(Math.abs(r - origin.row), Math.abs(c - origin.col));
        delays.set(r * next.cols + c, Math.min(ring * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS));
      }
    }
  }
  return delays;
}

const ARROW_MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function cellFromEvent(e: SyntheticEvent): Position | null {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-row]');
  if (!el) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
}

interface BoardProps {
  /** When on, a plain click/tap flags instead of revealing (handy on touch screens). */
  flagMode: boolean;
}

export function Board({ flagMode }: BoardProps) {
  const { session, reveal, chord, flag } = useGame();
  const { settings } = useSettings();
  const { board, status, explodedAt } = session.game;
  const { rows, cols } = board;

  const gridRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const lastPointerType = useRef('mouse');
  const lastActionPos = useRef<Position>({ row: 0, col: 0 });
  const [focus, setFocus] = useState<Position>({ row: 0, col: 0 });
  // Keep the roving tab stop on the board after it shrinks.
  const focusRow = Math.min(focus.row, rows - 1);
  const focusCol = Math.min(focus.col, cols - 1);

  // Work out which cells the last move revealed, for the staggered pop-in animation.
  // `prevBoard` only advances after commit, so both StrictMode renders see the same "before".
  const prevBoard = useRef(board);
  const revealDelays = useMemo(
    () => revealDelaysBetween(prevBoard.current, board, explodedAt ?? lastActionPos.current),
    [board, explodedAt],
  );
  useEffect(() => {
    prevBoard.current = board;
  }, [board]);
  // Shake only as the mine goes off, not when coming back to a lost game later.
  const shaking = status === 'lost' && revealDelays.size > 0;

  const startAudio = () => {
    if (!settings.muted) unlockAudio();
  };

  const primaryAction = useCallback(
    (pos: Position) => {
      lastActionPos.current = pos;
      const cell = board.cells[pos.row][pos.col];
      if (cell.state === 'revealed') chord(pos);
      else if (flagMode) flag(pos);
      else reveal(pos);
    },
    [board, flagMode, chord, flag, reveal],
  );

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    lastPointerType.current = e.pointerType;
    suppressClick.current = false;
    startAudio();
    const pos = cellFromEvent(e);
    if (!pos) return;
    if (e.pointerType === 'mouse') {
      if (e.button === 1) {
        e.preventDefault();
        lastActionPos.current = pos;
        chord(pos);
      }
      return;
    }
    // Touch / pen: a long press flags the cell.
    cancelPress();
    const timer = window.setTimeout(() => {
      press.current = null;
      suppressClick.current = true;
      flag(pos);
      navigator.vibrate?.(20);
    }, LONG_PRESS_MS);
    press.current = { timer, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_MOVE_TOLERANCE) cancelPress();
  };

  const onClick = (e: MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const pos = cellFromEvent(e);
    if (pos) primaryAction(pos);
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    // Touch browsers fire contextmenu on long press too; the long-press timer handles those.
    if (lastPointerType.current !== 'mouse') return;
    const pos = cellFromEvent(e);
    if (pos) flag(pos);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    startAudio();
    const pos = cellFromEvent(e);
    if (!pos) return;
    const move = ARROW_MOVES[e.key];
    if (move) {
      e.preventDefault();
      const row = Math.min(rows - 1, Math.max(0, pos.row + move[0]));
      const col = Math.min(cols - 1, Math.max(0, pos.col + move[1]));
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-row="${row}"][data-col="${col}"]`)?.focus();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      flag(pos);
    }
    // Enter / Space trigger the button's native click, which goes through onClick.
  };

  const onFocus = (e: SyntheticEvent) => {
    const pos = cellFromEvent(e);
    if (pos) setFocus(pos);
  };

  return (
    <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1">
      <div
        ref={gridRef}
        role="group"
        aria-label={`Minefield, ${rows} rows by ${cols} columns`}
        className={`ms-board mx-auto grid w-max touch-manipulation gap-px rounded-md bg-base-content/20 p-px ${shaking ? 'ms-shake' : ''}`}
        style={{ '--cols': cols, gridTemplateColumns: `repeat(${cols}, var(--cell))` } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      >
        {board.cells.map((rowCells) =>
          rowCells.map((cell) => (
            <CellView
              key={`${cell.row}-${cell.col}`}
              cell={cell}
              status={status}
              exploded={explodedAt?.row === cell.row && explodedAt?.col === cell.col}
              tabbable={cell.row === focusRow && cell.col === focusCol}
              revealDelay={revealDelays.get(cell.row * cols + cell.col)}
            />
          )),
        )}
      </div>
    </div>
  );
}
