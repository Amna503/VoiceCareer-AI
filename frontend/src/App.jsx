import { useState } from 'react'
import InterviewPage from './pages/InterviewPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  const [showInterview, setShowInterview] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  // The analysis the backend generated for this candidate. The dashboard renders
  // from this — it never builds its own roadmap.
  const [result, setResult] = useState(null)

  if (showDashboard) {
    return <DashboardPage result={result} onBack={() => { setResult(null); setShowDashboard(false) }} />
  }

  if (showInterview) {
    return (
      <InterviewPage
        onFinish={(payload) => {
          setResult(payload)
          setShowDashboard(true)
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
        onClick={() => setShowInterview(true)}
        className="px-8 py-3 rounded-full bg-electric-violet hover:bg-voice-teal transition-colors duration-300 font-semibold text-white shadow-lg"
      >
        Start Interview
      </button>

    </div>
  )
}

export default App
