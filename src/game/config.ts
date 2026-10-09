import type { BoardConfig } from './types';

export type PresetId = 'beginner' | 'intermediate' | 'expert';

export const DIFFICULTY_PRESETS: Record<PresetId, { label: string; config: BoardConfig }> = {
  beginner: { label: 'Beginner', config: { rows: 9, cols: 9, mines: 10 } },
  intermediate: { label: 'Intermediate', config: { rows: 16, cols: 16, mines: 40 } },
  expert: { label: 'Expert', config: { rows: 16, cols: 30, mines: 99 } },
};

export const CUSTOM_LIMITS = {
  minRows: 5,
  maxRows: 30,
  minCols: 5,
  maxCols: 40,
  minMines: 1,
} as const;

/** At least one cell must be free of mines so the board is winnable. */
export function maxMinesFor(rows: number, cols: number): number {
  return rows * cols - 1;
}

export type ConfigErrors = Partial<Record<keyof BoardConfig, string>>;

/** Validates a custom board. Returns an empty object when the config is valid. */
export function validateCustomConfig({ rows, cols, mines }: BoardConfig): ConfigErrors {
  const errors: ConfigErrors = {};
  const { minRows, maxRows, minCols, maxCols, minMines } = CUSTOM_LIMITS;

  if (!Number.isInteger(rows) || rows < minRows || rows > maxRows) {
    errors.rows = `Rows must be a whole number from ${minRows} to ${maxRows}.`;
  }
  if (!Number.isInteger(cols) || cols < minCols || cols > maxCols) {
    errors.cols = `Columns must be a whole number from ${minCols} to ${maxCols}.`;
  }
  if (!errors.rows && !errors.cols) {
    const max = maxMinesFor(rows, cols);
    if (!Number.isInteger(mines) || mines < minMines || mines > max) {
      errors.mines = `Mines must be a whole number from ${minMines} to ${max}.`;
    }
  } else if (!Number.isInteger(mines) || mines < minMines) {
    errors.mines = `Mines must be a whole number of at least ${minMines}.`;
  }
  return errors;
}
