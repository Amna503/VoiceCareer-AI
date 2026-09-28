import { useCallback, useState } from 'react'
import InterviewPage from './pages/InterviewPage'
import DashboardPage from './pages/DashboardPage'

/**
 * App shell.
 *
 * The interview flow is untouched: `home` and `interview` render exactly what
 * they always did. The dashboard brings its own sidebar/header chrome, and its
 * nav entries either switch page (Home / Interview) or switch the dashboard
 * sub-view (Profile / Settings / Career Roadmap).
 *
 * The analysis the backend generated for this candidate is passed straight
 * through — the dashboard never builds its own roadmap.
 */
function App() {
  const [page, setPage] = useState('home')
  // Which dashboard sub-view is showing: 'dashboard' | 'profile' | 'settings' | 'roadmap'
  const [dashView, setDashView] = useState('dashboard')
  const [result, setResult] = useState(null)

  const handleDashboardNavigate = useCallback((id, section) => {
    if (id === 'home') {
      setResult(null)
      setPage('home')
      return
    }
    if (id === 'interview') {
      setPage('interview')
      return
    }
    if (id === 'roadmap' || section === 'roadmap') {
      setPage('dashboard')
      setDashView('roadmap')
      return
    }
    if (id === 'profile' || id === 'settings') {
      setPage('dashboard')
      setDashView(id)
      return
    }
    setPage('dashboard')
    setDashView('dashboard')
  }, [])

  if (page === 'dashboard') {
    return (
      <DashboardPage
        result={result}
        activeView={dashView}
        onNavigate={handleDashboardNavigate}
        onBack={() => {
          setResult(null)
          setDashView('dashboard')
          setPage('home')
        }}
      />
    )
  }

  if (page === 'interview') {
    return (
      <InterviewPage
        onBack={() => setPage('home')}
        onFinish={(payload) => {
          setResult(payload)
          setDashView('dashboard')
          setPage('dashboard')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-midnight-navy text-cloud-white flex flex-col items-center justify-center px-6 text-center">

      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-electric-violet to-voice-teal bg-clip-text text-transparent">
        VoiceCareer AI
      </h1>

      <p className="text-lg text-soft-lavender mb-8">
        "Speak. Practice. Improve. Build Your Career."
      </p>

      <p className="max-w-xl text-slate-300 mb-10">
        Struggling to choose the right career path or practice interviews?
        VoiceCareer AI lets you speak naturally with an AI career coach —
        no forms, no typing, just conversation.
      </p>

      <button
        onClick={() => setPage('interview')}
        className="px-8 py-3 rounded-full bg-electric-violet hover:bg-voice-teal transition-colors duration-300 font-semibold text-white shadow-lg"
      >
        Start Interview
      </button>

    </div>
  )
}

export default App
