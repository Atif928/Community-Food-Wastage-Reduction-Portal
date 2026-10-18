/**
 * NotFoundPage - friendly 404 for unknown routes.
 */
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="text-center">
        <span className="text-6xl" aria-hidden="true">🍽️</span>
        <h1 className="mt-4 text-4xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          We couldn't find the page you're looking for.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-primary">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
