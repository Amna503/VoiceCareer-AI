import { useState } from "react";
import { useHashRoute } from "../lib/router";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/coach", label: "Voice Coach" },
];

function Brand() {
  return (
    <a href="#/" className="flex items-center gap-2 shrink-0" aria-label="VoiceCareer AI home">
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" className="fill-emerald-100" />
        <path
          d="M12 15a3.25 3.25 0 0 0 3.25-3.25V6.75a3.25 3.25 0 1 0-6.5 0v5A3.25 3.25 0 0 0 12 15z"
          className="fill-emerald-600"
        />
        <path
          d="M17.75 11.5a.75.75 0 1 0-1.5 0 4.25 4.25 0 0 1-8.5 0 .75.75 0 1 0-1.5 0 5.75 5.75 0 0 0 5 5.696V19h-2.5a.75.75 0 1 0 0 1.5h6a.75.75 0 1 0 0-1.5h-2.5v-1.804a5.75 5.75 0 0 0 5-5.696z"
          className="fill-emerald-600"
        />
      </svg>
      <span className="font-bold text-lg tracking-tight">
        VoiceCareer<span className="text-emerald-600"> AI</span>
      </span>
    </a>
  );
}

export default function Navbar() {
  const route = useHashRoute();
  const [open, setOpen] = useState(false);

  const isActive = (to) => route === to;
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Brand />

        {/* Desktop navigation */}
        <div className="hidden sm:flex items-center gap-1">
          {LINKS.map((link) => (
            <a
              key={link.to}
              href={`#${link.to}`}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#/coach"
            className="ml-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            Start Coaching
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="sm:hidden p-2 -mr-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {LINKS.map((link) => (
            <a
              key={link.to}
              href={`#${link.to}`}
              onClick={closeMenu}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#/coach"
            onClick={closeMenu}
            className="block px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold text-center transition-colors hover:bg-emerald-700"
          >
            Start Coaching
          </a>
        </div>
      )}
    </header>
  );
}