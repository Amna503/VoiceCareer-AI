function InterviewResults() {
  const results = [
    {
      question: 'Tell me about a React project you built.',
      answer: 'I built an e-commerce website using React and an API.',
      feedback: 'Good structure, but explain API error handling next time.',
    },
    {
      question: 'How did you handle loading states?',
      answer: 'I used a loading spinner while data was fetching.',
      feedback: 'Clear answer, shows practical understanding.',
    },
  ]

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-voice-teal mb-4">Interview Results</h3>
      <div className="flex flex-col gap-4">
        {results.map((r, i) => (
          <div key={i} className="border-b border-white/10 pb-3 last:border-none">
            <p className="text-cloud-white font-medium mb-1">Q: {r.question}</p>
            <p className="text-slate-300 text-sm mb-1">A: {r.answer}</p>
            <p className="text-coral-pulse text-sm">💡 {r.feedback}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InterviewResults