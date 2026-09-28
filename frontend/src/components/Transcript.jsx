import { useEffect, useRef } from 'react'

/**
 * Live transcript for the voice interview.
 * `messages` are finalized turns; `interimUser` is the in-progress user transcript
 * from transcript.user.delta, so speech appears as it is being recognized.
 */
function Transcript({ messages = [], interimUser = '', isSpeaking = false, isActive = false }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, interimUser, isSpeaking])

  const empty = messages.length === 0 && !interimUser && !isSpeaking

  return (
    <div className="w-full max-w-2xl bg-slate-indigo rounded-2xl p-6 h-96 overflow-y-auto flex flex-col gap-4">
      {empty ? (
        <p className="text-soft-lavender text-center m-auto max-w-sm">
          {isActive
            ? 'The interviewer is starting up — speak when prompted.'
            : 'Set your target role, then start the interview and speak naturally.'}
        </p>
      ) : (
        <>
          {messages.map((msg) => (
            <div
              key={msg.id ?? `${msg.sender}-${msg.text?.slice(0, 12)}`}
              className={`max-w-[85%] px-4 py-2 rounded-xl whitespace-pre-wrap ${
                msg.sender === 'user' || msg.speaker === 'user'
                  ? 'bg-electric-violet self-end text-white'
                  : 'bg-cloud-white/10 self-start text-cloud-white'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wide opacity-60 mb-1">
                {msg.sender === 'user' || msg.speaker === 'user' ? 'You' : 'Interviewer'}
              </span>
              {msg.text}
            </div>
          ))}

          {interimUser ? (
            <div className="max-w-[85%] px-4 py-2 rounded-xl bg-electric-violet/40 self-end text-cloud-white italic">
              <span className="block text-[10px] uppercase tracking-wide opacity-60 mb-1">You</span>
              {interimUser}
            </div>
          ) : null}

          {isSpeaking ? (
            <div className="max-w-[85%] px-4 py-2 rounded-xl bg-cloud-white/10 self-start text-soft-lavender italic">
              Interviewer is speaking…
            </div>
          ) : null}

          <div ref={endRef} />
        </>
      )}
    </div>
  )
}

export default Transcript
