import { useEffect, useRef } from 'react';
import type { Board, GameState } from '../game';
import { playSound } from '../audio/sounds';

function counts(board: Board) {
  let revealed = 0;
  let flagged = 0;
  let questioned = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.state === 'revealed') revealed++;
      else if (cell.state === 'flagged') flagged++;
      else if (cell.state === 'questioned') questioned++;
    }
  }
  return { revealed, flagged, questioned };
}

/** Plays a sound for each change in the game: reveal, flood fill, mark, win or loss. */
export function useGameSounds(game: GameState, muted: boolean): void {
  const prevRef = useRef(game);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = game;
    if (muted || prev === game) return;

    if (game.status === 'lost' && prev.status !== 'lost') return playSound('lose');
    if (game.status === 'won' && prev.status !== 'won') return playSound('win');

    const before = counts(prev.board);
    const after = counts(game.board);
    const revealedDelta = after.revealed - before.revealed;
    if (revealedDelta > 0) return playSound(revealedDelta > 1 ? 'cascade' : 'reveal');
    // A reset clears everything: stay quiet rather than playing an "unflag".
    if (after.revealed === 0 && after.flagged === 0 && after.questioned === 0) return;
    if (after.flagged > before.flagged) return playSound('flag');
    if (after.flagged !== before.flagged || after.questioned !== before.questioned) playSound('unflag');
  }, [game, muted]);
}
