import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

/** How much the role needs a skill, derived from the importance the backend assigned. */
const REQUIRED_BY_IMPORTANCE = { critical: 90, important: 70, 'nice-to-have': 50 }

/** Free-text level from the LLM enrichment, when present. */
const LEVEL_SCORE = {
  beginner: 25,
  novice: 20,
  basic: 25,
  intermediate: 55,
  competent: 55,
  advanced: 80,
  expert: 95,
}

/**
 * Skill gap analysis for the candidate's actual target role.
 * Values come from the backend: the requirement bar is the role's own importance
 * band, the current bar is whether the skill is covered (and the level the
 * interviewer/analyst estimated when it is not).
 */
function SkillGapChart({ skillGaps }) {
  const matched = skillGaps?.matchedSkills || []
  const gaps = skillGaps?.gaps || []

  const levelFor = (skill) => {
    const hit = gaps.find((gap) => gap.skill === skill)
    if (!hit) return 85
    if (hit.currentLevel && LEVEL_SCORE[String(hit.currentLevel).toLowerCase()]) {
      return LEVEL_SCORE[String(hit.currentLevel).toLowerCase()]
    }
    return hit.inJobDescription ? 35 : 20
  }

  const data = [
    ...gaps.map((gap) => ({
      skill: gap.skill,
      current: levelFor(gap.skill),
      required: REQUIRED_BY_IMPORTANCE[gap.importance] ?? 60,
      importance: gap.importance,
    })),
    ...matched.map((skill) => ({
      skill,
      current: 85,
      required: 85,
      importance: 'covered',
    })),
  ].slice(0, 10)

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-voice-teal mb-1">Skill Gap Analysis</h3>
      {skillGaps ? (
        <p className="text-xs text-slate-400 mb-4">
          {skillGaps.gapCount} of {skillGaps.totalRequired} {skillGaps.targetRoleTitle} requirements
          outstanding · readiness {skillGaps.readiness}%
        </p>
      ) : (
        <p className="text-xs text-slate-400 mb-4">No skill gap analysis yet.</p>
      )}

      {data.length ? (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="skill" stroke="#F4F3FF" interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis stroke="#F4F3FF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1A2E', border: 'none' }}
                formatter={(value, name) => [`${value}`, name]}
              />
              <Bar dataKey="current" fill="#A29BFE" name="Your Level" radius={[6, 6, 0, 0]} />
              <Bar dataKey="required" fill="#00CEC9" name="Required Level" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-2 mt-4">
            {gaps.slice(0, 6).map((gap) => (
              <span key={gap.skill} className="text-xs px-3 py-1 rounded-full bg-white/10 text-cloud-white">
                {gap.skill} · {gap.importance}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-slate-300 text-sm">Generate a plan to see your gaps.</p>
      )}
    </div>
  )
}

export default SkillGapChart
