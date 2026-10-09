import { DIFFICULTY_PRESETS, validateCustomConfig, type BoardConfig, type PresetId } from '../game';

export type DifficultyId = PresetId | 'custom';

export const THEMES = [
  { id: 'system', label: 'System (light / dark)' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'cupcake', label: 'Cupcake' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'retro', label: 'Retro' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'forest', label: 'Forest' },
  { id: 'dracula', label: 'Dracula' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export interface Settings {
  difficulty: DifficultyId;
  custom: BoardConfig;
  safeFirstClick: boolean;
  /** Right-click cycles flagged → ? → blank instead of flagged → blank. */
  questionMarks: boolean;
  muted: boolean;
  theme: ThemeId;
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'beginner',
  custom: { rows: 12, cols: 12, mines: 20 },
  safeFirstClick: true,
  questionMarks: true,
  muted: false,
  theme: 'system',
};

// Also read by the inline script in index.html to apply the theme before first paint.
export const SETTINGS_STORAGE_KEY = 'minesweeper:settings';

const DIFFICULTY_IDS: readonly DifficultyId[] = ['beginner', 'intermediate', 'expert', 'custom'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Turns whatever was in storage into valid settings, falling back to defaults field by field. */
export function sanitizeSettings(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULT_SETTINGS;

  const difficulty = DIFFICULTY_IDS.find((id) => id === value.difficulty) ?? DEFAULT_SETTINGS.difficulty;
  const theme = THEMES.find((t) => t.id === value.theme)?.id ?? DEFAULT_SETTINGS.theme;
  const bool = (key: 'safeFirstClick' | 'questionMarks' | 'muted') =>
    typeof value[key] === 'boolean' ? (value[key] as boolean) : DEFAULT_SETTINGS[key];

  let custom = DEFAULT_SETTINGS.custom;
  if (isRecord(value.custom)) {
    const candidate = {
      rows: Number(value.custom.rows),
      cols: Number(value.custom.cols),
      mines: Number(value.custom.mines),
    };
    if (Object.keys(validateCustomConfig(candidate)).length === 0) custom = candidate;
  }

  return {
    difficulty,
    custom,
    safeFirstClick: bool('safeFirstClick'),
    questionMarks: bool('questionMarks'),
    muted: bool('muted'),
    theme,
  };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); settings then live in memory only.
  }
}

export function boardConfigFor(settings: Settings): BoardConfig {
  return settings.difficulty === 'custom' ? settings.custom : DIFFICULTY_PRESETS[settings.difficulty].config;
}

export function difficultyLabel(difficulty: DifficultyId): string {
  return difficulty === 'custom' ? 'Custom' : DIFFICULTY_PRESETS[difficulty].label;
}
