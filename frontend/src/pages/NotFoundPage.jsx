export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-emerald-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#/"
            className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
          >
            Go Home
          </a>
          <a
            href="#/coach"
            className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
          >
            Try Voice Coach
          </a>
        </div>
      </div>
    </div>
  );
}