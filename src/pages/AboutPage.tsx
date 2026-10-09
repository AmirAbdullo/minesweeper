import { Link } from 'react-router-dom';

const STACK = [
  { name: 'React 18', what: 'UI components and state (Context + useReducer)' },
  { name: 'TypeScript', what: 'Strict mode throughout' },
  { name: 'Vite', what: 'Dev server and production build' },
  { name: 'Tailwind CSS', what: 'Utility-first styling' },
  { name: 'DaisyUI', what: 'Navbar, cards, buttons, toggles, selects, modals and themes' },
  { name: 'React Router', what: 'Game, Help, Settings and About pages' },
  { name: 'Web Audio API', what: 'Sound effects generated in code, so there are no audio files' },
  { name: 'Vitest', what: 'Unit tests for the pure game logic and stats' },
];

export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold">About</h1>

      <section className="card bg-base-100 shadow">
        <div className="card-body gap-3">
          <h2 className="card-title">The game</h2>
          <p>
            Minesweeper is a single-player logic puzzle that shipped with Windows from 1990 onwards and has been a
            favourite coffee-break game ever since. You clear a grid of hidden cells using the numbers as clues to work
            out where the mines are hiding.
          </p>
          <p>
            This version has the three classic difficulties, custom boards, a safe first click, chording, question
            marks, per-difficulty stats and best times, synthesised sound effects, animations, touch support and a
            choice of themes. New to the game? Read the{' '}
            <Link to="/help" className="link link-primary">
              Help page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="card bg-base-100 shadow">
        <div className="card-body gap-3">
          <h2 className="card-title">Who built it</h2>
          <p>
            It was built by an AI coding agent (Claude Code, by Anthropic), working from a written specification. The
            agent wrote the game logic, interface, tests and documentation.
          </p>
        </div>
      </section>

      <section className="card bg-base-100 shadow">
        <div className="card-body gap-3">
          <h2 className="card-title">Tech stack</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {STACK.map((item) => (
              <li key={item.name} className="flex flex-col gap-1 rounded-box bg-base-200 p-3">
                <span className="badge badge-primary">{item.name}</span>
                <span className="text-sm text-base-content/80">{item.what}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-base-content/70">
            The rules live in a plain TypeScript module (<code>src/game/</code>) with no React imports, so they can be
            tested on their own and reused in another interface.
          </p>
        </div>
      </section>
    </div>
  );
}
