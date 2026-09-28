import { useCallback, useEffect, useState } from 'react'
import CareerProfileCard from '../components/CareerProfileCard'
import SkillGapChart from '../components/SkillGapChart'
import InterviewResults from '../components/InterviewResults'
import RoadmapCard from '../components/RoadmapCard'

/**
 * Career Dashboard.
 *
 * Every card renders data that came from the backend. Nothing here contains a
 * roadmap, a skill list, or a role: the plan is generated per candidate by
 * ai/career-engine (gaps -> weeks) and rendered as returned.
 */
function DashboardPage({ result, onBack }) {
  // The interview flow hands us the analysis it already fetched.
  const [data, setData] = useState(result?.analysis || null)
  const targetRole = result?.targetRole || data?.targetRole || 'frontend'
  const mode = result?.mode || data?.mode || null

  const [role, setRole] = useState(targetRole)
  const [skillsInput, setSkillsInput] = useState('')
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)

  // The role catalogue comes from the backend so the UI never hardcodes a list.
  useEffect(() => {
    let active = true
    fetch('/api/evaluate/roles')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (active && payload?.roles) setRoles(payload.roles)
      })
      .catch(() => {
        /* the select falls back to the role already chosen */
      })
    return () => {
      active = false
    }
  }, [])

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/evaluate/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: role,
          skills: skillsInput
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not generate your plan')
      setData(payload)
      setSource(payload.roadmap?.source || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [role, skillsInput])

  const skillGaps = data?.skillGaps || null
  const roadmap = data?.roadmap || null
  const evaluation = data?.evaluation || null
  const roleTitle = roadmap?.targetRoleTitle || skillGaps?.targetRoleTitle || null

  return (
    <div className="min-h-screen bg-midnight-navy text-cloud-white px-6 py-10 flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-3xl font-bold text-soft-lavender">Career Dashboard</h2>
        {roleTitle ? (
          <p className="text-sm text-slate-300">
            Plan generated for <span className="text-voice-teal">{roleTitle}</span>
            {skillGaps ? ` · readiness ${skillGaps.readiness}%` : ''}
            {skillGaps?.experienceLevel?.label ? ` · ${skillGaps.experienceLevel.label}` : ''}
          </p>
        ) : null}
      </div>

      <div className="w-full max-w-4xl bg-slate-indigo rounded-2xl p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-soft-lavender">Target job</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="bg-midnight-navy text-cloud-white rounded-lg px-3 py-2 border border-slate-500/40 focus:border-voice-teal outline-none"
            >
              {(roles.length
                ? roles.map((item) => ({ value: item.key, label: item.title }))
                : [{ value: role, label: role }]
              ).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            <span className="text-soft-lavender">Your current skills (comma separated)</span>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. JavaScript, HTML, CSS"
              disabled={loading}
              className="bg-midnight-navy text-cloud-white rounded-lg px-3 py-2 border border-slate-500/40 focus:border-voice-teal outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="px-6 py-2 rounded-full bg-voice-teal/80 hover:bg-voice-teal disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Generating your plan…' : 'Generate my 30-day plan'}
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm text-soft-lavender hover:text-cloud-white transition-colors"
            >
              ← New interview
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="text-coral-pulse text-sm bg-coral-pulse/15 border border-coral-pulse/40 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        {!data ? (
          <p className="text-slate-300 text-sm">
            Choose your target job and current skills, then generate your plan. Or finish an
            interview to have it built from your transcript.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <CareerProfileCard
          roleTitle={roleTitle}
          targetRole={roadmap?.targetRole || skillGaps?.targetRole}
          skillGaps={skillGaps}
          roadmap={roadmap}
          mode={mode}
        />
        <SkillGapChart skillGaps={skillGaps} />
        <InterviewResults evaluation={evaluation} skillGaps={skillGaps} />
        <RoadmapCard roadmap={roadmap} source={source} loading={loading} />
      </div>
    </div>
  )
}

export default DashboardPage
