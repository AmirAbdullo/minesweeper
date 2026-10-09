import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NUMBER_COLORS } from '../components/numberColors';

// A 3×3 example: the centre "3" touches exactly three mines.
const EXAMPLE: (number | 'mine' | null)[][] = [
  ['mine', 2, 1],
  [2, 3, 'mine'],
  [1, 'mine', 2],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        <h2 className="card-title">{title}</h2>
        {children}
      </div>
    </section>
  );
}

const CONTROLS = [
  { action: 'Reveal a cell', mouse: 'Left-click', touch: 'Tap', keys: ['Enter', 'Space'] },
  {
    action: 'Flag → ? → blank (cycle marks)',
    mouse: 'Right-click',
    touch: 'Long-press, or tap with Flag mode on',
    keys: ['F'],
  },
  { action: 'Chord (open around a number)', mouse: 'Click the number, or middle-click', touch: 'Tap the number', keys: ['Enter'] },
  { action: 'Move between cells', mouse: '—', touch: '—', keys: ['←', '↑', '→', '↓'] },
  { action: 'New game', mouse: 'Click the smiley', touch: 'Tap the smiley', keys: ['R'] },
];

export function HelpPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold">How to play</h1>

      <Section title="The goal">
        <p>
          The board hides a number of mines. Reveal every cell that <em>isn't</em> a mine and you win. Reveal a mine and
          the game is over. The counter on the left shows how many mines are left to find (total mines minus the flags
          you've placed; question marks don't count). The timer on the right starts with your first click, and your
          best time for the board is shown under it.
        </p>
        <p>
          Your first click is always safe while <Link to="/settings" className="link link-primary">Safe first click</Link>{' '}
          is on: the mines are placed only after you click, away from that cell.
        </p>
      </Section>

      <Section title="What the numbers mean">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="grid w-max shrink-0 gap-px rounded-md bg-base-content/20 p-px"
            style={{ gridTemplateColumns: 'repeat(3, var(--cell))', ['--cell' as string]: '2.5rem' }}
            aria-label="Example: a 3 surrounded by three mines"
            role="img"
          >
            {EXAMPLE.flat().map((value, i) => (
              <span
                key={i}
                className={`ms-cell flex items-center justify-center bg-base-100 font-extrabold ${
                  typeof value === 'number' ? NUMBER_COLORS[value] : ''
                } ${i === 4 ? 'outline-2 outline-offset-[-2px] outline-primary' : ''}`}
              >
                {value === 'mine' ? '💣' : value}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            <p>
              A revealed number tells you how many of its <strong>eight neighbours</strong> (up, down, left, right and
              the four diagonals) contain a mine. The highlighted <strong>3</strong> above touches exactly three mines.
            </p>
            <p>
              A blank cell means <strong>zero</strong> neighbouring mines, so all its neighbours are revealed for you
              automatically — that's why one click can open a large area.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Number colours">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <span key={n} className={`badge badge-lg bg-base-200 font-extrabold ${NUMBER_COLORS[n]}`}>
              {n}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Flagging">
        <p>
          When you're sure a cell hides a mine, mark it with a flag 🚩. Flagged cells can't be revealed by accident.
          Right-click the flag again to change it to a question mark or clear it (see below). Flags are just notes for yourself — you win by revealing every safe cell, whether or not
          you flag the mines.
        </p>
        <p>
          <strong>Chording:</strong> once a number has as many flags around it as its value, click the number to reveal
          all its other neighbours in one go. If one of your flags is wrong, that can set off a mine, so chord carefully.
        </p>
        <p>
          On phones and tablets, long-press a cell to flag it, or switch on <strong>Flag mode</strong> above the board so
          every tap places a flag.
        </p>
      </Section>

      <Section title="Question marks">
        <p>
          Not sure about a cell? With <strong>Question marks</strong> turned on in{' '}
          <Link to="/settings" className="link link-primary">
            Settings
          </Link>{' '}
          (it's on by default), right-clicking or long-pressing cycles a cell through three states:
        </p>
        <div className="flex flex-wrap items-center gap-2" aria-label="Flag, then question mark, then blank">
          <span className="badge badge-lg">🚩 Flag</span>
          <span aria-hidden="true">→</span>
          <span className="badge badge-lg font-extrabold text-secondary">? Question mark</span>
          <span aria-hidden="true">→</span>
          <span className="badge badge-lg">Blank</span>
        </div>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Question marks <strong>don't count</strong> toward the mine counter. Only flags do.
          </li>
          <li>
            Unlike a flag, a question mark doesn't protect the cell: you can still reveal it, and a flood fill opens it
            too.
          </li>
          <li>When chording, question marks count as unflagged cells and get opened.</li>
          <li>With the option off, right-click simply toggles between flag and blank.</li>
        </ul>
      </Section>

      <Section title="Stats">
        <p>
          The{' '}
          <Link to="/stats" className="link link-primary">
            Stats page
          </Link>{' '}
          shows games played, games won, win rate and your best time for each difficulty, plus overall totals. Your best
          time for the current board also appears under the timer.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>A game counts once it ends in a win or a loss. Starting a new game part-way through doesn't count.</li>
          <li>Best times only come from wins and are measured to a tenth of a second.</li>
          <li>Each custom board size has its own entry.</li>
          <li>Stats are saved in this browser. You can clear them with the Reset button on the Stats page.</li>
        </ul>
      </Section>

      <Section title="Sound & animation">
        <p>
          Revealing, flagging, winning and losing each have their own sound effect. The sounds are generated live in
          your browser, with no audio files. Mute them with the 🔊 button above the board or in Settings.
        </p>
        <p>
          Cells pop in with a ripple when a blank cell opens a large area, and the board shakes when you hit a mine.
          If your device is set to reduce motion, these animations are switched off.
        </p>
      </Section>

      <Section title="Controls">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Action</th>
                <th>Mouse</th>
                <th>Touch</th>
                <th>Keyboard</th>
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map((c) => (
                <tr key={c.action}>
                  <td className="font-medium">{c.action}</td>
                  <td>{c.mouse}</td>
                  <td>{c.touch}</td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {c.keys.map((k) => (
                        <kbd key={k} className="kbd kbd-sm">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-base-content/70">
          For the keyboard, press <kbd className="kbd kbd-sm">Tab</kbd> to move focus onto the board first.
        </p>
      </Section>

      <Section title="Tips">
        <ul className="list-inside list-disc space-y-1">
          <li>Start in the middle of the board — big openings give you the most information.</li>
          <li>A 1 touching a single hidden cell means that cell is a mine.</li>
          <li>If a number already has all its mines flagged, every other neighbour is safe.</li>
          <li>Sometimes it really is a 50/50 guess. That's Minesweeper!</li>
        </ul>
      </Section>
    </div>
  );
}
