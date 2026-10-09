import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DIFFICULTY_PRESETS,
  formatDuration,
  formatWinRate,
  getDifficultyStats,
  lossesOf,
  parseStatsKey,
  totalStats,
  winRate,
  type PresetId,
} from '../game';
import { useStats } from '../state/StatsContext';

const PRESET_IDS = Object.keys(DIFFICULTY_PRESETS) as PresetId[];

interface Row {
  key: string;
  name: string;
  detail: string;
}

export function StatsPage() {
  const { stats, resetStats } = useStats();
  const confirmRef = useRef<HTMLDialogElement>(null);
  const totals = totalStats(stats);

  // Presets always appear; each custom board size gets its own row once it has been played.
  const rows: Row[] = [
    ...PRESET_IDS.map((id) => {
      const { label, config } = DIFFICULTY_PRESETS[id];
      return { key: id, name: label, detail: `${config.rows}×${config.cols} · ${config.mines} mines` };
    }),
    ...Object.keys(stats.byKey)
      .flatMap((key) => {
        const parsed = parseStatsKey(key);
        if (!parsed || parsed.difficulty !== 'custom') return [];
        const { rows: r, cols: c, mines: m } = parsed.config;
        return [{ key, name: 'Custom', detail: `${r}×${c} · ${m} mines`, size: r * c }];
      })
      .sort((a, b) => a.size - b.size),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-3xl font-bold">Stats</h1>

      <div className="stats stats-vertical w-full bg-base-100 shadow sm:stats-horizontal">
        <div className="stat">
          <div className="stat-title">Games played</div>
          <div className="stat-value">{totals.played}</div>
          <div className="stat-desc">All difficulties</div>
        </div>
        <div className="stat">
          <div className="stat-title">Games won</div>
          <div className="stat-value text-success">{totals.won}</div>
          <div className="stat-desc">{totals.played - totals.won} lost</div>
        </div>
        <div className="stat">
          <div className="stat-title">Win rate</div>
          <div className="stat-value text-primary">{formatWinRate(winRate(totals))}</div>
          <div className="stat-desc">Wins ÷ games played</div>
        </div>
      </div>

      <section className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">By difficulty</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Difficulty</th>
                  <th className="text-right">Played</th>
                  <th className="text-right">Won</th>
                  <th className="text-right">Lost</th>
                  <th className="text-right">Win rate</th>
                  <th className="text-right">Best time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, name, detail }) => {
                  const s = getDifficultyStats(stats, key);
                  return (
                    <tr key={key}>
                      <td>
                        <div className="font-semibold">{name}</div>
                        <div className="text-xs text-base-content/60">{detail}</div>
                      </td>
                      <td className="text-right tabular-nums">{s.played}</td>
                      <td className="text-right tabular-nums">{s.won}</td>
                      <td className="text-right tabular-nums">{lossesOf(s)}</td>
                      <td className="text-right tabular-nums">{formatWinRate(winRate(s))}</td>
                      <td className="text-right font-mono tabular-nums">
                        {s.bestTimeMs === null ? '—' : <span className="badge badge-ghost">{formatDuration(s.bestTimeMs)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-base-content/70">
            A game counts once it ends in a win or a loss. Starting a new game part-way through doesn't count. Custom
            boards are tracked separately for each size.
          </p>
        </div>
      </section>

      <section className="card bg-base-100 shadow">
        <div className="card-body sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="card-title">Reset stats</h2>
            <p className="text-sm text-base-content/70">Clear every game count and best time. This can't be undone.</p>
          </div>
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-outline btn-error"
              onClick={() => confirmRef.current?.showModal()}
              disabled={totals.played === 0}
            >
              Reset stats
            </button>
          </div>
        </div>
      </section>

      {totals.played === 0 && (
        <p className="text-center text-base-content/70">
          No games finished yet.{' '}
          <Link to="/" className="link link-primary">
            Play one
          </Link>{' '}
          to start your record.
        </p>
      )}

      <dialog ref={confirmRef} className="modal" aria-labelledby="reset-stats-title">
        <div className="modal-box">
          <h3 id="reset-stats-title" className="text-lg font-bold">
            Reset all stats?
          </h3>
          <p className="py-4">
            This clears {totals.played} recorded {totals.played === 1 ? 'game' : 'games'} and every best time. Your
            settings are kept.
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn btn-ghost">Cancel</button>
              <button className="btn btn-error" onClick={resetStats}>
                Reset stats
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close">close</button>
        </form>
      </dialog>
    </div>
  );
}
