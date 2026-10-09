import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDuration, formatWinRate, getDifficultyStats, isBestTime, winRate } from '../game';
import { useGame } from '../state/GameContext';
import { useStats } from '../state/StatsContext';

/** Pause before the modal opens, so the player sees the final board first. */
const OPEN_DELAY_MS = 600;

export function GameOverModal() {
  const { session, reset } = useGame();
  const { stats } = useStats();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status } = session.game;
  const won = status === 'won';
  const over = status === 'won' || status === 'lost';
  const durationMs =
    session.startedAt !== null && session.endedAt !== null ? session.endedAt - session.startedAt : 0;
  const record = getDifficultyStats(stats, session.statsKey);
  // The result is recorded as the game ends, so a winning time equal to the best means a new record.
  const newBest = won && isBestTime(stats, session.statsKey, durationMs);

  // Open only when the game ends while this page is showing, not when returning to a finished game.
  const prevStatus = useRef(status);
  useEffect(() => {
    const dialog = dialogRef.current;
    const justEnded = over && prevStatus.current !== status;
    prevStatus.current = status;
    if (!dialog) return;
    if (!over) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!justEnded) return;
    const id = window.setTimeout(() => {
      if (!dialog.open) dialog.showModal();
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [over, status]);

  const playAgain = () => {
    dialogRef.current?.close();
    reset();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" aria-labelledby="game-over-title">
      <div className="modal-box text-center">
        <div className="text-6xl" aria-hidden="true">
          {won ? '🎉' : '💥'}
        </div>
        <h2 id="game-over-title" className="mt-2 text-2xl font-bold">
          {won ? 'You cleared the field!' : 'Boom! You hit a mine.'}
        </h2>
        <p className="mt-2 text-base-content/70">
          {won ? `Finished in ${formatDuration(durationMs)}.` : 'Every mine is now shown on the board. Have another go?'}
        </p>
        {newBest && <p className="badge badge-warning badge-lg mt-3 gap-1">🏆 New best time!</p>}
        <p className="mt-3 text-sm text-base-content/70">
          Won {record.won} of {record.played} on this board ({formatWinRate(winRate(record))}) · Best{' '}
          {formatDuration(record.bestTimeMs)} ·{' '}
          <Link to="/stats" className="link" onClick={() => dialogRef.current?.close()}>
            All stats
          </Link>
        </p>
        <div className="modal-action justify-center">
          <form method="dialog">
            <button className="btn btn-ghost">View board</button>
          </form>
          <button type="button" className="btn btn-primary" onClick={playAgain} autoFocus>
            Play again
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
