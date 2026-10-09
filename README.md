# Minesweeper

Classic Minesweeper built with **React 18**, **TypeScript** (strict), **Vite**, **Tailwind CSS** and **DaisyUI**.

- Beginner (9×9, 10 mines), Intermediate (16×16, 40), Expert (16×30, 99) and custom boards
- Safe first click (toggleable), flood fill, flags, optional question marks, chording, timer and mine counter
- Stats per difficulty: games played, games won, win rate and best time, with a reset button
- Staggered flood-fill animation, a board shake when you hit a mine, and Web Audio sound effects (mutable)
- Mouse, touch (long-press or "Flag mode") and keyboard controls
- Nine DaisyUI themes, including "System", which follows your OS light/dark setting
- Settings and stats saved in `localStorage`
- Pages: Game, Stats, Help, Settings, About (React Router)

## Requirements

- Node.js 18 or newer (tested with Node 22)
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (normally http://localhost:5173).

## Scripts

| Command              | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Start the dev server with hot reload                |
| `npm test`           | Run the unit tests once (Vitest)                    |
| `npm run test:watch` | Run the tests in watch mode                         |
| `npm run typecheck`  | Type-check the whole project                        |
| `npm run build`      | Type-check and build for production into `dist/`   |
| `npm run preview`    | Serve the production build locally                  |

## How to play

- **Left-click / tap** reveals a cell. A number shows how many of its 8 neighbours are mines; a blank (0) opens its neighbours automatically.
- **Right-click / long-press** cycles a cell through 🚩 flag → ? question mark → blank. Question marks don't count toward the mine counter, and you can turn them off in Settings (then it's just flag ↔ blank). On touch screens you can also turn on **Flag mode** above the board.
- **Click a revealed number** whose flags match its value to open all its other neighbours ("chording"). Middle-click works too.
- **Keyboard:** <kbd>Tab</kbd> onto the board, use the arrow keys to move, <kbd>Enter</kbd>/<kbd>Space</kbd> to reveal, <kbd>F</kbd> to flag and <kbd>R</kbd> for a new game.
- You win when every non-mine cell is revealed.
- A game counts toward your stats once it ends in a win or a loss. Each custom board size is tracked separately.

## Project structure

```
src/
├── game/                   Pure game logic — no React imports
│   ├── types.ts            Cell, Board, GameState, …
│   ├── minesweeper.ts      createBoard, placeMines, revealCell, chordCell, toggleFlag/nextMark, checkGameStatus, …
│   ├── stats.ts            recordGame, winRate, totals, best times, stats keys, formatting, sanitising
│   ├── config.ts           Difficulty presets and custom-board validation
│   ├── index.ts            Barrel export
│   ├── minesweeper.test.ts Vitest unit tests (rules + question marks)
│   └── stats.test.ts       Vitest unit tests (stats calculations)
├── state/
│   ├── settings.ts         Settings type, defaults, themes, localStorage load/save
│   ├── SettingsContext.tsx Settings provider (persists and applies the theme)
│   ├── StatsContext.tsx    Stats provider (persists to localStorage)
│   ├── gameReducer.ts      Game session reducer (game state + stats key + timer timestamps)
│   └── GameContext.tsx     Game provider (useReducer); restarts on board changes, records finished games
├── audio/sounds.ts         Web Audio sound effects, synthesised in code
├── hooks/                  useElapsedSeconds, useGameSounds
├── components/             Layout, Navbar, Board, CellView, GameOverModal
├── pages/                  GamePage, StatsPage, HelpPage, SettingsPage, AboutPage, NotFoundPage
├── App.tsx                 Providers and routes
├── main.tsx
└── index.css               Tailwind + DaisyUI setup and board sizing
```

### Design notes

- **Game logic is pure and immutable.** Each function takes a `GameState` and returns a new one. Updates are copy-on-write, so unchanged cells keep their object identity and `React.memo` skips re-rendering them, even on the 480-cell Expert board.
- **Mines are placed lazily** on the first reveal. With safe first click on, the clicked cell and (when there is room) its neighbours are excluded, so the first click always opens an area.
- **Randomness is injectable** (`rng` parameter), which keeps the tests deterministic.
- **Board events are delegated**: the board has one set of pointer, mouse and keyboard handlers, and each cell is identified by `data-row`/`data-col`.
- **Animations come from comparing boards**: the board diffs the previous and next state to find newly revealed cells. Each one gets an animation delay based on its distance from the click, so a flood fill ripples outward. Animations turn off when the OS asks for reduced motion.
- **Sounds come from state changes**: `useGameSounds` compares consecutive game states (reveal, cascade, flag, unflag, win, loss). The audio context is created on the first click, because browsers require a user gesture before audio can play.

## Deploying

`npm run build` produces a static site in `dist/`. The app uses browser-history routing, so on a static host, configure a fallback that serves `index.html` for unknown paths. Most hosts call this an "SPA fallback" or a rewrite rule.
