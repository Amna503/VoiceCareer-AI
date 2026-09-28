/**
 * Interview evaluation for this candidate's actual session.
 * Reads the report the backend produced from the transcript; falls back to the
 * skill gaps when no interview has been scored yet.
 */
function InterviewResults({ evaluation, skillGaps }) {
  const summary = evaluation?.summary || null
  const breakdown = evaluation?.breakdown || {}

  if (!summary && !skillGaps) {
    return (
      <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-voice-teal mb-4">Interview Results</h3>
        <p className="text-slate-300 text-sm">Finish an interview to see your scored results.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md flex flex-col">
      <h3 className="text-xl font-semibold text-voice-teal mb-4">Interview Results</h3>

      {summary ? (
        <>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-4xl font-bold text-voice-teal">{summary.overallScore ?? '—'}</span>
            <span className="text-soft-lavender text-sm">{summary.scoreLabel || 'Scored'}</span>
          </div>

          {summary.strengths?.length ? (
            <div className="mb-3">
              <p className="text-soft-lavender text-sm font-medium mb-1">Strengths</p>
              <ul className="text-slate-300 text-sm list-disc pl-5">
                {summary.strengths.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.improvements?.length ? (
            <div className="mb-3">
              <p className="text-coral-pulse text-sm font-medium mb-1">What to improve</p>
              <ul className="text-slate-300 text-sm list-disc pl-5">
                {summary.improvements.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {Object.keys(breakdown).length ? (
            <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
              {Object.entries(breakdown).map(([key, item]) => (
                <div key={key}>
                  <p className="text-cloud-white text-sm font-medium">
                    {item.name} <span className="text-voice-teal">{item.score}</span>
                  </p>
                  {item.feedback ? <p className="text-slate-300 text-xs">💡 {item.feedback}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-slate-300 text-sm">No interview scored yet for this role.</p>
          {skillGaps?.gaps?.length ? (
            <div>
              <p className="text-soft-lavender text-sm font-medium mb-1">Priority gaps to work on</p>
              <ul className="text-slate-300 text-sm list-disc pl-5">
                {skillGaps.gaps.slice(0, 4).map((gap) => (
                  <li key={gap.skill}>
                    {gap.skill}
                    {gap.suggestedImprovement ? ` — ${gap.suggestedImprovement}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default InterviewResults
