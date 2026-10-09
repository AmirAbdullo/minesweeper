import { describe, expect, it } from 'vitest';
import {
  createStats,
  formatDuration,
  formatWinRate,
  getDifficultyStats,
  isBestTime,
  lossesOf,
  parseStatsKey,
  recordGame,
  sanitizeStats,
  statsKeyFor,
  totalStats,
  winRate,
} from './index';

describe('recordGame', () => {
  it('counts games played and won per difficulty', () => {
    let stats = createStats();
    stats = recordGame(stats, { key: 'beginner', won: true, durationMs: 30_000 });
    stats = recordGame(stats, { key: 'beginner', won: false, durationMs: 5_000 });
    stats = recordGame(stats, { key: 'expert', won: false, durationMs: 90_000 });

    expect(getDifficultyStats(stats, 'beginner')).toEqual({ played: 2, won: 1, bestTimeMs: 30_000 });
    expect(lossesOf(getDifficultyStats(stats, 'beginner'))).toBe(1);
    expect(getDifficultyStats(stats, 'expert')).toEqual({ played: 1, won: 0, bestTimeMs: null });
    expect(getDifficultyStats(stats, 'intermediate')).toEqual({ played: 0, won: 0, bestTimeMs: null });
  });

  it('keeps the fastest win and ignores losses for the best time', () => {
    let stats = createStats();
    stats = recordGame(stats, { key: 'beginner', won: true, durationMs: 40_000 });
    stats = recordGame(stats, { key: 'beginner', won: false, durationMs: 1_000 }); // fast loss: no record
    expect(getDifficultyStats(stats, 'beginner').bestTimeMs).toBe(40_000);
    stats = recordGame(stats, { key: 'beginner', won: true, durationMs: 25_400 });
    expect(getDifficultyStats(stats, 'beginner').bestTimeMs).toBe(25_400);
    stats = recordGame(stats, { key: 'beginner', won: true, durationMs: 60_000 }); // slower: unchanged
    expect(getDifficultyStats(stats, 'beginner').bestTimeMs).toBe(25_400);
  });

  it('does not mutate the previous stats', () => {
    const before = createStats();
    recordGame(before, { key: 'beginner', won: true, durationMs: 1_000 });
    expect(before.byKey).toEqual({});
  });

  it('reports whether a just-recorded win set the best time', () => {
    let stats = recordGame(createStats(), { key: 'beginner', won: true, durationMs: 20_000 });
    expect(isBestTime(stats, 'beginner', 20_000)).toBe(true);
    stats = recordGame(stats, { key: 'beginner', won: true, durationMs: 35_000 });
    expect(isBestTime(stats, 'beginner', 35_000)).toBe(false);
  });
});

describe('win rate and totals', () => {
  it('computes the win rate, or null before any game', () => {
    expect(winRate({ played: 0, won: 0 })).toBeNull();
    expect(winRate({ played: 3, won: 2 })).toBeCloseTo(2 / 3);
    expect(formatWinRate(winRate({ played: 3, won: 2 }))).toBe('67%');
    expect(formatWinRate(null)).toBe('—');
  });

  it('sums games across all difficulties', () => {
    let stats = createStats();
    stats = recordGame(stats, { key: 'beginner', won: true, durationMs: 1 });
    stats = recordGame(stats, { key: 'expert', won: false, durationMs: 1 });
    stats = recordGame(stats, { key: 'custom:10x10:20', won: true, durationMs: 1 });
    expect(totalStats(stats)).toEqual({ played: 3, won: 2 });
    expect(winRate(totalStats(stats))).toBeCloseTo(2 / 3);
  });
});

describe('stats keys', () => {
  it('uses the preset id, or the board size for custom games', () => {
    const config = { rows: 10, cols: 12, mines: 20 };
    expect(statsKeyFor('expert', config)).toBe('expert');
    expect(statsKeyFor('custom', config)).toBe('custom:10x12:20');
    expect(parseStatsKey('custom:10x12:20')).toEqual({ difficulty: 'custom', config });
    expect(parseStatsKey('beginner')?.config).toEqual({ rows: 9, cols: 9, mines: 10 });
    expect(parseStatsKey('nonsense')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats seconds with tenths, and minutes when needed', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(12_345)).toBe('12.3s');
    expect(formatDuration(83_456)).toBe('1:23.4');
    expect(formatDuration(600_000)).toBe('10:00.0');
  });
});

describe('sanitizeStats', () => {
  it('keeps valid entries and drops malformed ones', () => {
    const stats = sanitizeStats({
      byKey: {
        beginner: { played: 4, won: 2, bestTimeMs: 15_000 },
        expert: { played: 1, won: 3, bestTimeMs: null }, // more wins than games
        intermediate: { played: 'many', won: 0 },
        'custom:8x8:10': { played: 2, won: 0, bestTimeMs: 5_000 }, // best time without a win
        bogus: { played: 1, won: 1, bestTimeMs: 1 },
      },
    });
    expect(stats.byKey).toEqual({
      beginner: { played: 4, won: 2, bestTimeMs: 15_000 },
      'custom:8x8:10': { played: 2, won: 0, bestTimeMs: null },
    });
    expect(sanitizeStats('garbage')).toEqual(createStats());
  });
});
