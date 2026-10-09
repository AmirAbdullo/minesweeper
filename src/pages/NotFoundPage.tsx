import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="text-6xl" aria-hidden="true">
        💥
      </div>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-base-content/70">That square was a mine. Let's get you back to safe ground.</p>
      <Link to="/" className="btn btn-primary">
        Back to the game
      </Link>
    </div>
  );
}
