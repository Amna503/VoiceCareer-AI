const STATE_STYLES = {
  connecting: { dot: 'bg-amber-300 animate-pulse', text: 'text-amber-200', label: 'Connecting' },
  connected: { dot: 'bg-voice-teal', text: 'text-voice-teal', label: 'Connected' },
  listening: { dot: 'bg-voice-teal animate-pulse', text: 'text-voice-teal', label: 'Listening' },
  speaking: { dot: 'bg-electric-violet animate-pulse', text: 'text-soft-lavender', label: 'Speaking' },
  disconnected: { dot: 'bg-slate-500', text: 'text-slate-400', label: 'Disconnected' },
  error: { dot: 'bg-coral-pulse animate-pulse', text: 'text-coral-pulse', label: 'Error' },
}

/**
 * Live connection indicator for the AssemblyAI Voice Agent WebSocket.
 * Renders one of: connecting, connected, listening, speaking, disconnected, error.
 */
function ConnectionState({ state = 'disconnected', detail = '' }) {
  const style = STATE_STYLES[state] || STATE_STYLES.disconnected

  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-indigo/80 px-4 py-2 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span className={`font-medium ${style.text}`}>{style.label}</span>
      {detail ? <span className="text-slate-300">{detail}</span> : null}
    </div>
  )
}

export default ConnectionState
