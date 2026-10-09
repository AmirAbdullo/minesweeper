import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200 text-base-content">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="footer footer-center p-4 text-xs text-base-content/60">
        <p>Minesweeper · React + TypeScript + DaisyUI</p>
      </footer>
    </div>
  );
}
