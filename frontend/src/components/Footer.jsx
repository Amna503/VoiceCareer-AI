export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-bold text-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15a3.25 3.25 0 0 0 3.25-3.25V6.75a3.25 3.25 0 1 0-6.5 0v5A3.25 3.25 0 0 0 12 15z"
                className="fill-emerald-600"
              />
              <path
                d="M17.75 11.5a.75.75 0 1 0-1.5 0 4.25 4.25 0 0 1-8.5 0 .75.75 0 1 0-1.5 0 5.75 5.75 0 0 0 5 5.696V19h-2.5a.75.75 0 1 0 0 1.5h6a.75.75 0 1 0 0-1.5h-2.5v-1.804a5.75 5.75 0 0 0 5-5.696z"
                className="fill-emerald-600"
              />
            </svg>
            VoiceCareer AI
          </p>
          <p className="mt-3 text-sm text-slate-500">
            An AI-powered voice career coach that helps you discover your path, practice interviews,
            and build your professional roadmap by simply speaking.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Quick Links
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <a href="#/" className="hover:text-emerald-700 transition-colors">
                Home
              </a>
            </li>
            <li>
              <a href="#/coach" className="hover:text-emerald-700 transition-colors">
                Voice Coach
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Contact
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <a
                href="mailto:support@voicecareerai.app"
                className="hover:text-emerald-700 transition-colors break-all"
              >
                support@voicecareerai.app
              </a>
            </li>
            <li>
              <a href="tel:+15550142827" className="hover:text-emerald-700 transition-colors">
                +1 (555) 014-2827
              </a>
            </li>
            <li className="text-slate-500">Mon–Fri, 9am–6pm</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {year} VoiceCareer AI. All rights reserved.</p>
          <p>Built with AssemblyAI, Groq, and React.</p>
        </div>
      </div>
    </footer>
  );
}