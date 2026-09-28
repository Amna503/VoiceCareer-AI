const FEATURES = [
  {
    title: "Career Discovery",
    description:
      "Answer a few natural voice questions and let the agent identify the career paths that match your interests, skills, and goals.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Natural Voice Interaction",
    description:
      "Just speak. AssemblyAI turns your voice into text, and the AI coach responds with clear, conversational answers read back to you.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 0 1-7 7m0 0a7 7 0 0 1-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 0 1-3-3V5a3 3 0 1 1 6 0v6a3 3 0 0 1-3 3z" />
      </svg>
    ),
  },
  {
    title: "Adaptive Mock Interviews",
    description:
      "Practice technical and behavioral interviews that adapt to your answers, complete with follow-up questions and a realistic pace.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Interview Evaluation",
    description:
      "Get instant, structured feedback on clarity, depth, enthusiasm, and confidence with actionable scores after every practice session.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9 9 0 1 0 20.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0 1 20.488 9z" />
      </svg>
    ),
  },
  {
    title: "Skill Gap Analysis",
    description:
      "Understand exactly which skills your target role demands and where you currently stand, broken down by priority.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    title: "Career Roadmap",
    description:
      "Leave with a personalized, step-by-step learning and application plan that turns your goals into actions.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l5.447-2.724A1 1 0 0 0 15 16.382V5.618a1 1 0 0 0-1.447-.894L9 7m0 13V7" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Start a session",
    description: "Open the Voice Coach and hit Start Recording — no typing required.",
  },
  {
    number: "02",
    title: "Speak naturally",
    description: "Share your aspirations, ask career questions, or rehearse an interview response.",
  },
  {
    number: "03",
    title: "AI listens & guides",
    description: "Your speech is transcribed and the coach replies conversationally, reading answers back.",
  },
  {
    number: "04",
    title: "Get evaluated",
    description: "Review your interview performance, skill gaps, and a step-by-step career roadmap.",
  },
];

export default function LandingPage() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Powered by AssemblyAI + Groq
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Speak. Practice.
              <br />
              <span className="text-emerald-600">Build your career.</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
              VoiceCareer AI is your AI-powered voice career coach. Discover the right career path,
              rehearse mock interviews, and leave with a personalized roadmap — all by simply
              talking.
            </p>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
              <a
                href="#/coach"
                className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
              >
                Start Voice Session
              </a>
              <button
                onClick={scrollToFeatures}
                className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
              >
                Explore Features
              </button>
            </div>
          </div>

          {/* Voice orb illustration (pure SVG, no image downloads) */}
          <div className="flex justify-center" aria-hidden="true">
            <div className="relative w-56 h-56 sm:w-72 sm:h-72">
              <span className="voice-ring absolute inset-0 rounded-full border-2 border-emerald-300" />
              <span
                className="voice-ring absolute inset-0 rounded-full border-2 border-emerald-200"
                style={{ animationDelay: "0.6s" }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-300/50 flex items-center justify-center">
                <svg className="w-24 h-24 sm:w-28 sm:h-28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 1 0-7 0V12a3.5 3.5 0 0 0 3.5 3.5z"
                    className="fill-white"
                  />
                  <path
                    d="M18.5 11.75a.75.75 0 0 0-1.5 0 5 5 0 0 1-10 0 .75.75 0 0 0-1.5 0 6.5 6.5 0 0 0 5.75 6.456V19.5h-2.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25v-1.294a6.5 6.5 0 0 0 5.75-6.456z"
                    className="fill-white"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to grow</h2>
            <p className="mt-3 text-slate-600">
              Six intelligent capabilities working together as your personal voice career companion.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-600">
              From your first hello to a complete career roadmap in a few simple steps.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-4xl font-bold text-emerald-200">{step.number}</div>
                <h3 className="mt-2 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-12 sm:px-12 text-center text-white shadow-xl shadow-emerald-200">
            <h2 className="text-3xl font-bold">Ready to talk about your future?</h2>
            <p className="mt-3 text-emerald-50 max-w-xl mx-auto">
              No forms, no typing. Just open the Voice Coach and start a conversation about the
              career you want.
            </p>
            <a
              href="#/coach"
              className="mt-8 inline-block px-8 py-3 rounded-full bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
            >
              Open Voice Coach
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}