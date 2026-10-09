import { useRef, useState, type FormEvent } from 'react';
import { CUSTOM_LIMITS, DIFFICULTY_PRESETS, maxMinesFor, validateCustomConfig, type BoardConfig, type PresetId } from '../game';
import { playSound, unlockAudio } from '../audio/sounds';
import { useSettings } from '../state/SettingsContext';
import { THEMES, type ThemeId } from '../state/settings';

const PRESET_IDS = Object.keys(DIFFICULTY_PRESETS) as PresetId[];

function DifficultyCard() {
  const { settings, updateSettings } = useSettings();
  const [draft, setDraft] = useState({
    rows: String(settings.custom.rows),
    cols: String(settings.custom.cols),
    mines: String(settings.custom.mines),
  });

  const parsed: BoardConfig = { rows: Number(draft.rows), cols: Number(draft.cols), mines: Number(draft.mines) };
  const errors = validateCustomConfig(parsed);
  const valid = Object.keys(errors).length === 0;
  const isApplied =
    settings.difficulty === 'custom' &&
    parsed.rows === settings.custom.rows &&
    parsed.cols === settings.custom.cols &&
    parsed.mines === settings.custom.mines;
  const maxMines = Number.isInteger(parsed.rows) && Number.isInteger(parsed.cols) && !errors.rows && !errors.cols
    ? maxMinesFor(parsed.rows, parsed.cols)
    : null;

  const applyCustom = (e: FormEvent) => {
    e.preventDefault();
    if (valid) updateSettings({ difficulty: 'custom', custom: parsed });
  };

  const fields = [
    { key: 'rows', label: 'Rows', min: CUSTOM_LIMITS.minRows, max: CUSTOM_LIMITS.maxRows },
    { key: 'cols', label: 'Columns', min: CUSTOM_LIMITS.minCols, max: CUSTOM_LIMITS.maxCols },
    { key: 'mines', label: 'Mines', min: CUSTOM_LIMITS.minMines, max: maxMines ?? undefined },
  ] as const;

  return (
    <section className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Difficulty</h2>
        <p className="text-sm text-base-content/70">Changing the board size or mine count starts a new game.</p>

        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Difficulty">
          {PRESET_IDS.map((id) => {
            const { label, config } = DIFFICULTY_PRESETS[id];
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-3 rounded-box border p-3 transition-colors ${
                  settings.difficulty === id ? 'border-primary bg-primary/10' : 'border-base-300 hover:bg-base-200'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  className="radio radio-primary"
                  checked={settings.difficulty === id}
                  onChange={() => updateSettings({ difficulty: id })}
                />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="text-sm text-base-content/70">
                    {config.rows}×{config.cols} · {config.mines} mines
                  </span>
                </span>
              </label>
            );
          })}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-box border p-3 transition-colors ${
              settings.difficulty === 'custom' ? 'border-primary bg-primary/10' : 'border-base-300 hover:bg-base-200'
            }`}
          >
            <input
              type="radio"
              name="difficulty"
              className="radio radio-primary"
              checked={settings.difficulty === 'custom'}
              onChange={() => updateSettings({ difficulty: 'custom' })}
            />
            <span>
              <span className="block font-semibold">Custom</span>
              <span className="text-sm text-base-content/70">
                {settings.custom.rows}×{settings.custom.cols} · {settings.custom.mines} mines
              </span>
            </span>
          </label>
        </div>

        <form onSubmit={applyCustom} className="mt-4 rounded-box bg-base-200 p-4" noValidate>
          <h3 className="font-semibold">Custom board</h3>
          <div className="grid gap-x-4 sm:grid-cols-3">
            {fields.map(({ key, label, min, max }) => (
              <fieldset key={key} className="fieldset">
                <legend className="fieldset-legend">{label}</legend>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`input w-full ${errors[key] ? 'input-error' : ''}`}
                  min={min}
                  max={max}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  aria-invalid={Boolean(errors[key])}
                />
                <p className={`label whitespace-normal ${errors[key] ? 'text-error' : ''}`}>
                  {errors[key] ?? `${min}–${max ?? '…'}`}
                </p>
              </fieldset>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={!valid || isApplied}>
              {isApplied ? 'Custom board in use' : 'Use custom board'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const confirmRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <DifficultyCard />

      <section className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Gameplay</h2>
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block font-medium">Safe first click</span>
              <span className="text-sm text-base-content/70">
                Mines are placed after your first click, never under it (and, when there's room, never next to it).
              </span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary mt-1"
              checked={settings.safeFirstClick}
              onChange={(e) => updateSettings({ safeFirstClick: e.target.checked })}
            />
          </label>
          <div className="divider my-1" />
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block font-medium">Question marks</span>
              <span className="text-sm text-base-content/70">
                Right-click (or long-press) cycles a cell through 🚩 → ? → blank. Question marks are notes for unsure
                cells: they don't count toward the mine counter and can still be revealed.
              </span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary mt-1"
              checked={settings.questionMarks}
              onChange={(e) => updateSettings({ questionMarks: e.target.checked })}
            />
          </label>
        </div>
      </section>

      <section className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Sound</h2>
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block font-medium">Mute sounds</span>
              <span className="text-sm text-base-content/70">
                Turn off the effects for revealing, flagging, winning and losing. You can also use the 🔊 button on the
                game screen.
              </span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary mt-1"
              checked={settings.muted}
              onChange={(e) => updateSettings({ muted: e.target.checked })}
            />
          </label>
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-sm"
              disabled={settings.muted}
              onClick={() => {
                unlockAudio();
                playSound('win');
              }}
            >
              ▶ Play a test sound
            </button>
          </div>
        </div>
      </section>

      <section className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Appearance</h2>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Theme</legend>
            <select
              className="select w-full"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as ThemeId })}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </fieldset>
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="text-sm text-base-content/70">Preview</span>
            {['bg-primary', 'bg-secondary', 'bg-accent', 'bg-neutral', 'bg-base-300'].map((c) => (
              <span key={c} className={`h-6 w-6 rounded-full border border-base-content/10 ${c}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="card bg-base-100 shadow">
        <div className="card-body sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="card-title">Reset</h2>
            <p className="text-sm text-base-content/70">Restore the default difficulty, gameplay, sound and theme. Stats are kept.</p>
          </div>
          <div className="card-actions">
            <button type="button" className="btn btn-outline btn-error" onClick={() => confirmRef.current?.showModal()}>
              Reset settings
            </button>
          </div>
        </div>
      </section>

      <dialog ref={confirmRef} className="modal" aria-labelledby="reset-title">
        <div className="modal-box">
          <h3 id="reset-title" className="text-lg font-bold">
            Reset all settings?
          </h3>
          <p className="py-4">
            Difficulty, gameplay options, sound and theme go back to their defaults. Your stats are kept. Your current
            game restarts if the board changes.
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn btn-ghost">Cancel</button>
              <button className="btn btn-error" onClick={resetSettings}>
                Reset
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
