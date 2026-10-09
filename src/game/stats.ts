import { DIFFICULTY_PRESETS, type PresetId } from './config';
import type { BoardConfig } from './types';

/** Results for one difficulty (or one custom board size). */
export interface DifficultyStats {
  /** Finished games: wins plus losses. */
  played: number;
  won: number;
  /** Fastest win in milliseconds, or null before the first win. */
  bestTimeMs: number | null;
}

/** All stats, keyed by `statsKeyFor` — one entry per preset and per custom board size. */
export interface Stats {
  byKey: Record<string, DifficultyStats>;
}

export interface GameResult {
  key: string;
  won: boolean;
  durationMs: number;
}

export type StatsDifficulty = PresetId | 'custom';

export const EMPTY_DIFFICULTY_STATS: DifficultyStats = { played: 0, won: 0, bestTimeMs: null };

export function createStats(): Stats {
  return { byKey: {} };
}

/**
 * Presets share one entry each. Custom boards are tracked per size, since a best time on a
 * 10×10 board says nothing about a 30×40 one.
 */
export function statsKeyFor(difficulty: StatsDifficulty, config: BoardConfig): string {
  return difficulty === 'custom' ? `custom:${config.rows}x${config.cols}:${config.mines}` : difficulty;
}

/** Reverses `statsKeyFor`. Returns null for keys it doesn't recognise. */
export function parseStatsKey(key: string): { difficulty: StatsDifficulty; config: BoardConfig } | null {
  if (key in DIFFICULTY_PRESETS) {
    const id = key as PresetId;
    return { difficulty: id, config: DIFFICULTY_PRESETS[id].config };
  }
  const match = /^custom:(\d+)x(\d+):(\d+)$/.exec(key);
  if (!match) return null;
  return { difficulty: 'custom', config: { rows: Number(match[1]), cols: Number(match[2]), mines: Number(match[3]) } };
}

export function getDifficultyStats(stats: Stats, key: string): DifficultyStats {
  return stats.byKey[key] ?? EMPTY_DIFFICULTY_STATS;
}

/** Adds one finished game. The best time only ever improves, and only wins can set it. */
export function recordGame(stats: Stats, { key, won, durationMs }: GameResult): Stats {
  const current = getDifficultyStats(stats, key);
  const ms = Math.max(0, Math.round(durationMs));
  const bestTimeMs = won && (current.bestTimeMs === null || ms < current.bestTimeMs) ? ms : current.bestTimeMs;
  return {
    byKey: {
      ...stats.byKey,
      [key]: { played: current.played + 1, won: current.won + (won ? 1 : 0), bestTimeMs },
    },
  };
}

/** True when `durationMs` is the recorded best for `key`, i.e. a just-recorded win set the record. */
export function isBestTime(stats: Stats, key: string, durationMs: number): boolean {
  return getDifficultyStats(stats, key).bestTimeMs === Math.max(0, Math.round(durationMs));
}

export function lossesOf(s: DifficultyStats): number {
  return s.played - s.won;
}

/** Fraction of games won, from 0 to 1, or null when nothing has been played. */
export function winRate(s: Pick<DifficultyStats, 'played' | 'won'>): number | null {
  return s.played === 0 ? null : s.won / s.played;
}

/** Games played and won across every difficulty. */
export function totalStats(stats: Stats): { played: number; won: number } {
  let played = 0;
  let won = 0;
  for (const s of Object.values(stats.byKey)) {
    played += s.played;
    won += s.won;
  }
  return { played, won };
}

export function formatWinRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

/** 12345 → "12.3s", 83456 → "1:23.4" (tenths are truncated, like a stopwatch). Null → "—". */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = (tenths % 600) / 10;
  return minutes > 0 ? `${minutes}:${seconds.toFixed(1).padStart(4, '0')}` : `${seconds.toFixed(1)}s`;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Keeps only well-formed entries from whatever was found in storage. */
export function sanitizeStats(value: unknown): Stats {
  const stats = createStats();
  if (typeof value !== 'object' || value === null) return stats;
  const byKey = (value as { byKey?: unknown }).byKey;
  if (typeof byKey !== 'object' || byKey === null) return stats;

  for (const [key, entry] of Object.entries(byKey)) {
    if (parseStatsKey(key) === null || typeof entry !== 'object' || entry === null) continue;
    const { played, won, bestTimeMs } = entry as Record<string, unknown>;
    if (!isCount(played) || !isCount(won) || won > played) continue;
    const best = isCount(bestTimeMs) && won > 0 ? bestTimeMs : null;
    stats.byKey[key] = { played, won, bestTimeMs: best };
  }
  return stats;
}
