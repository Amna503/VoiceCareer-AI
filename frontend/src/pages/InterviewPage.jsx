import { useState } from 'react'
import MicButton from '../components/MicButton'
import Transcript from '../components/Transcript'

function InterviewPage({ onFinish }) {
  const [micState, setMicState] = useState('idle')
  const [messages, setMessages] = useState([])

  const handleMicClick = () => {
    if (micState === 'idle') {
      setMicState('listening')
      setMessages((prev) => [...prev, { sender: 'user', text: 'I enjoy building websites with React.' }])

      setTimeout(() => {
        setMicState('speaking')
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Great! Tell me about a React project you built.' }])
      }, 1500)

      setTimeout(() => {
        setMicState('idle')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen bg-midnight-navy text-cloud-white flex flex-col items-center justify-center gap-8 px-6 py-10">
      <h2 className="text-2xl font-semibold text-soft-lavender">Mock Interview</h2>
      <Transcript messages={messages} />
      <MicButton state={micState} onClick={handleMicClick} />
      <p className="text-slate-400 text-sm">
        {micState === 'idle' && 'Tap to speak'}
        {micState === 'listening' && 'Listening...'}
        {micState === 'speaking' && 'AI is responding...'}
      </p>

      <button
        onClick={onFinish}
        className="mt-4 px-6 py-2 rounded-full bg-voice-teal/80 hover:bg-voice-teal text-white text-sm font-medium transition-colors"
      >
        Finish Interview → View Results
      </button>
    </div>
  )
}

export default InterviewPage