/**
 * Renders the roadmap exactly as the backend generated it.
 * There is no local plan data: if the backend sent no roadmap, this says so.
 */
function RoadmapCard({ roadmap, source, loading }) {
  const weeks = roadmap?.weeks || roadmap?.roadmap || []

  if (loading) {
    return (
      <div className="bg-slate-indigo rounded-2xl p-6 w-full md:col-span-2">
        <h3 className="text-xl font-semibold text-voice-teal mb-4">30-Day Career Roadmap</h3>
        <p className="text-slate-300 text-sm">Generating a plan for this role…</p>
      </div>
    )
  }

  if (!weeks.length) {
    return (
      <div className="bg-slate-indigo rounded-2xl p-6 w-full md:col-span-2">
        <h3 className="text-xl font-semibold text-voice-teal mb-4">30-Day Career Roadmap</h3>
        <p className="text-slate-300 text-sm">
          No roadmap yet. Pick a target job and generate your plan, or finish an interview.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full md:col-span-2">
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        <h3 className="text-xl font-semibold text-voice-teal">30-Day Career Roadmap</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-voice-teal/20 text-voice-teal">
          {roadmap.targetRole}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Built from your target role, its requirements, and {roadmap.prioritizedSkills?.length || 0} prioritized
        skill gap{(roadmap.prioritizedSkills?.length || 0) === 1 ? '' : 's'}
        {roadmap.source ? ` · ${source || roadmap.source}` : ''}
        {roadmap.consolidation ? ' · no gaps left, so this plan is about depth and interview readiness' : ''}
      </p>

      <div className="flex flex-col gap-4">
        {weeks.map((week) => (
          <div key={week.week} className="border-b border-white/10 pb-4 last:border-none last:pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-electric-violet text-white text-xs font-bold px-3 py-1 rounded-full min-w-fit">
                Week {week.week}
              </span>
              <span className="text-cloud-white font-medium text-sm">{week.focus}</span>
            </div>

            {week.skills?.length ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {week.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-1 rounded-full bg-white/10 text-cloud-white"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}

            {week.tasks?.length ? (
              <ul className="text-sm text-slate-300 flex flex-col gap-1 mt-2">
                {week.tasks.map((task, index) => (
                  <li key={`${task.title}-${index}`}>
                    <span className="text-soft-lavender">{task.type}:</span> {task.title}
                    {task.duration ? <span className="text-slate-500"> ({task.duration})</span> : null}
                    {task.description ? (
                      <span className="block text-xs text-slate-400">{task.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {week.project ? (
              <p className="text-xs text-slate-300 mt-2">
                <span className="text-soft-lavender">Project:</span> {week.project.title}
                {week.project.description ? (
                  <span className="block text-slate-400">{week.project.description}</span>
                ) : null}
              </p>
            ) : null}

            {week.outcome ? (
              <p className="text-xs text-coral-pulse mt-2">
                <span className="text-soft-lavender">Expected outcome:</span> {week.outcome}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {roadmap.totalHours ? (
        <p className="text-xs text-slate-400 mt-4">About {roadmap.totalHours} hours over 30 days.</p>
      ) : null}
    </div>
  )
}

export default RoadmapCard
