import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-slate-800">Page not found</h1>
      <Link to="/" className="font-semibold text-indigo-600">← Back to Home</Link>
    </div>
  );
}
