export default function MessageDisplay({ messages }) {
  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p className="text-lg">Start speaking to begin your career coaching session</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 border border-gray-200"
            }`}
          >
            <div className="text-xs font-medium mb-1 opacity-70">
              {msg.role === "user" ? "You" : "VoiceCareer AI"}
            </div>
            <p className="text-sm leading-relaxed">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
