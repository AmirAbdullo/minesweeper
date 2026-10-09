import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDuration, getDifficultyStats, remainingMines } from '../game';
import { Board } from '../components/Board';
import { GameOverModal } from '../components/GameOverModal';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { useGameSounds } from '../hooks/useGameSounds';
import { useGame } from '../state/GameContext';
import { useSettings } from '../state/SettingsContext';
import { useStats } from '../state/StatsContext';
import { difficultyLabel } from '../state/settings';

const FACES = { idle: '🙂', playing: '🙂', won: '😎', lost: '😵' } as const;

/** Three-digit LED-style readout, e.g. 007 or -03. */
function formatCounter(value: number): string {
  const clamped = Math.max(-99, Math.min(999, value));
  return clamped < 0 ? `-${String(-clamped).padStart(2, '0')}` : String(clamped).padStart(3, '0');
}

function Counter({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-base-content/60">{label}</span>
      <output
        aria-label={`${label}: ${value}`}
        className="min-w-[4.5ch] rounded-lg bg-neutral px-2 py-1 text-center font-mono text-2xl font-bold tabular-nums text-neutral-content sm:text-3xl"
      >
        {formatCounter(value)}
      </output>
      {/* Reserve the line even when empty, so both counters stay aligned. */}
      <span className="h-4 text-xs text-base-content/60">{caption}</span>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function GamePage() {
  const { session, reset } = useGame();
  const { settings, updateSettings } = useSettings();
  const { stats } = useStats();
  const [flagMode, setFlagMode] = useState(false);
  const { game, config, startedAt, endedAt } = session;
  const elapsed = useElapsedSeconds(startedAt, endedAt);
  const bestTimeMs = getDifficultyStats(stats, session.statsKey).bestTimeMs;
  useGameSounds(game, settings.muted);

  // R starts a new game from anywhere on this page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
        reset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reset]);

  return (
    <div className="flex flex-col items-center gap-4">
      <section className="card w-full max-w-full bg-base-100 shadow-xl sm:w-auto">
        <div className="card-body gap-4 p-3 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <Counter label="Mines" value={remainingMines(game.board)} />
            <button
              type="button"
              className="btn btn-circle btn-lg text-3xl"
              onClick={reset}
              aria-label="New game"
              title="New game (R)"
            >
              <span aria-hidden="true">{FACES[game.status]}</span>
            </button>
            <Counter label="Time" value={elapsed} caption={`Best ${formatDuration(bestTimeMs)}`} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to="/settings" className="badge badge-outline badge-lg gap-1 hover:badge-primary" title="Change difficulty">
              {difficultyLabel(settings.difficulty)} · {config.rows}×{config.cols} · {config.mines} mines
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square text-lg"
                onClick={() => updateSettings({ muted: !settings.muted })}
                aria-label={settings.muted ? 'Unmute sounds' : 'Mute sounds'}
                aria-pressed={settings.muted}
                title={settings.muted ? 'Unmute sounds' : 'Mute sounds'}
              >
                <span aria-hidden="true">{settings.muted ? '🔇' : '🔊'}</span>
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <span>🚩 Flag mode</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={flagMode}
                  onChange={(e) => setFlagMode(e.target.checked)}
                />
              </label>
            </div>
          </div>

          <Board flagMode={flagMode} />

          {game.status === 'won' && (
            <div role="status" className="alert alert-success">
              <span>🎉 You won in {elapsed} {elapsed === 1 ? 'second' : 'seconds'}!</span>
              <button type="button" className="btn btn-sm" onClick={reset}>
                Play again
              </button>
            </div>
          )}
          {game.status === 'lost' && (
            <div role="status" className="alert alert-error">
              <span>💥 You hit a mine. Better luck next time!</span>
              <button type="button" className="btn btn-sm" onClick={reset}>
                Play again
              </button>
            </div>
          )}
        </div>
      </section>

      <p className="hidden text-center text-sm text-base-content/60 sm:block">
        Left-click to reveal · Right-click to {settings.questionMarks ? 'flag / mark ?' : 'flag'} · Click a number to chord · <kbd className="kbd kbd-sm">R</kbd> new game ·{' '}
        <Link to="/help" className="link">
          More help
        </Link>
      </p>
      <p className="text-center text-sm text-base-content/60 sm:hidden">
        Tap to reveal · Long-press (or Flag mode) to flag ·{' '}
        <Link to="/help" className="link">
          Help
        </Link>
      </p>

      <GameOverModal />
    </div>
  );
}
