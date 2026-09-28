import { Mic, PhoneOff } from 'lucide-react'

const stateStyles = {
  idle: 'bg-slate-indigo ring-4 ring-soft-lavender/40',
  connecting: 'bg-amber-400/80 ring-4 ring-amber-300/40 animate-pulse',
  connected: 'bg-slate-indigo ring-4 ring-voice-teal/50',
  listening: 'bg-voice-teal ring-4 ring-voice-teal/50 animate-pulse',
  speaking: 'bg-electric-violet ring-4 ring-electric-violet/50 animate-pulse',
  disconnected: 'bg-slate-indigo ring-4 ring-soft-lavender/40',
  error: 'bg-coral-pulse ring-4 ring-coral-pulse/50',
}

/**
 * Session control for the voice interview. While connected this is a hang-up
 * button — the agent captures continuously, so there is no separate "speak" tap.
 */
function MicButton({ state = 'idle', onClick, disabled = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={active ? 'End interview' : 'Start interview'}
      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
        stateStyles[state] || stateStyles.idle
      }`}
    >
      {active ? <PhoneOff className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
    </button>
  )
}

export default MicButton
