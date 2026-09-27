function RoadmapCard() {
  const roadmap = [
    { week: 'Week 1', focus: 'JavaScript fundamentals' },
    { week: 'Week 2', focus: 'React fundamentals' },
    { week: 'Week 3', focus: 'API integration + project' },
    { week: 'Week 4', focus: 'Portfolio + interview preparation' },
  ]

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-voice-teal mb-4">30-Day Career Roadmap</h3>
      <div className="flex flex-col gap-3">
        {roadmap.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="bg-electric-violet text-white text-xs font-bold px-3 py-1 rounded-full min-w-fit">
              {r.week}
            </span>
            <span className="text-cloud-white text-sm">{r.focus}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RoadmapCard