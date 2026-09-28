import { Mic } from 'lucide-react'

function MicButton({ state = 'idle', onClick }) {
  const stateStyles = {
    idle: 'bg-slate-indigo ring-4 ring-soft-lavender/40',
    listening: 'bg-voice-teal ring-4 ring-voice-teal/50 animate-pulse',
    speaking: 'bg-electric-violet ring-4 ring-electric-violet/50 animate-pulse',
  }

  return (
    <button
      onClick={onClick}
      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${stateStyles[state]}`}
    >
      <Mic className="w-10 h-10 text-white" />
    </button>
  )
}

export default MicButton