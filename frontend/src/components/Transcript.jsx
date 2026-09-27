function Transcript({ messages = [] }) {
  return (
    <div className="w-full max-w-lg bg-slate-indigo rounded-2xl p-6 h-80 overflow-y-auto flex flex-col gap-4">
      {messages.length === 0 ? (
        <p className="text-soft-lavender text-center m-auto">
          Tap the mic to start speaking...
        </p>
      ) : (
        messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-xl ${
              msg.sender === 'user'
                ? 'bg-electric-violet self-end text-white'
                : 'bg-cloud-white/10 self-start text-cloud-white'
            }`}
          >
            {msg.text}
          </div>
        ))
      )}
    </div>
  )
}

export default Transcript