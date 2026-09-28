import { useEffect, useState } from 'react'
import MicButton from '../components/MicButton'
import Transcript from '../components/Transcript'
import ConnectionState from '../components/ConnectionState'
import useVoiceAgent from '../hooks/useVoiceAgent'

/**
 * Live mock interview driven by the AssemblyAI Voice Agent API.
 *
 * Browser mic -> AudioWorklet (24 kHz mono PCM16) -> wss://agents.assemblyai.com/v1/ws
 * -> career interview agent (configured server-side from ai/prompts + ai/career-engine)
 * -> spoken reply. Agent tool calls run on our backend against ai/evaluation and
 * ai/career-engine (POST /api/voice-agent/tools).
 */

/** Roles come from the career engine, so the UI never hardcodes a role list. */
function useTargetRoles() {
  const [roles, setRoles] = useState([])

  useEffect(() => {
    let active = true
    fetch('/api/evaluate/roles')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && Array.isArray(payload?.roles)) {
          setRoles(payload.roles.map((item) => ({ value: item.key, label: item.title })))
        }
      })
      .catch(() => {
        /* leave the list empty; the select falls back to the current value */
      })
    return () => {
      active = false
    }
  }, [])

  return roles
}

const INTERVIEW_MODES = [
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR / Behavioral' },
]

function ResultsSummary({ analysis, onContinue }) {
  if (!analysis) return null

  const score = analysis.evaluation?.summary
  const gaps = (analysis.skillGaps?.gaps || []).slice(0, 4)
  // The career engine emits `weeks`; `roadmap` is the legacy shape.
  const weeks = analysis.roadmap?.weeks || analysis.roadmap?.roadmap || []

  return (
    <div className="w-full max-w-2xl bg-slate-indigo rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-voice-teal">
          {score?.overallScore ?? '—'}
        </span>
        <span className="text-soft-lavender">{score?.scoreLabel || 'Scored'}</span>
      </div>

      {score?.strengths?.length ? (
        <div>
          <h4 className="text-voice-teal font-semibold mb-1">Strengths</h4>
          <ul className="text-sm text-slate-300 list-disc pl-5">
            {score.strengths.slice(0, 3).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {score?.improvements?.length ? (
        <div>
          <h4 className="text-coral-pulse font-semibold mb-1">What to improve</h4>
          <ul className="text-sm text-slate-300 list-disc pl-5">
            {score.improvements.slice(0, 3).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {gaps.length ? (
        <div>
          <h4 className="text-soft-lavender font-semibold mb-1">Priority skill gaps</h4>
          <div className="flex flex-wrap gap-2">
            {gaps.map((gap, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/10 text-cloud-white">
                {gap.skill} · {gap.importance}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {weeks.length ? (
        <div>
          <h4 className="text-soft-lavender font-semibold mb-1">Your 30-day plan</h4>
          <ul className="text-sm text-slate-300 flex flex-col gap-1">
            {weeks.map((week) => (
              <li key={week.week}>
                <span className="text-voice-teal">Week {week.week}:</span> {week.focus}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        className="self-start px-6 py-2 rounded-full bg-voice-teal/80 hover:bg-voice-teal text-white text-sm font-medium transition-colors"
      >
        View full dashboard →
      </button>
    </div>
  )
}

function InterviewPage({ onFinish, onBack }) {
  const [targetRole, setTargetRole] = useState('frontend')
  const [mode, setMode] = useState('technical')
  const [candidateName, setCandidateName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [scoring, setScoring] = useState(false)
  // Real wall-clock start of this interview, handed to the dashboard so its
  // header can show when this session actually happened.
  const [startedAt, setStartedAt] = useState(null)

  const availableRoles = useTargetRoles()
  const TARGET_ROLES = availableRoles.length
    ? availableRoles
    : [{ value: targetRole, label: targetRole }]

  const {
    connectionState,
    statusLabel,
    messages,
    interimUser,
    error,
    toolActivity,
    sessionId,
    isStarting,
    start,
    stop,
    getInterviewHistory,
  } = useVoiceAgent()

  const isLive = connectionState !== 'disconnected' && connectionState !== 'error'

  const handleStart = () => {
    setAnalysis(null)
    setStartedAt(new Date().toISOString())
    start({
      targetRole,
      mode,
      candidateName: candidateName.trim(),
      jobDescription: jobDescription.trim(),
      maxQuestions: 8,
    })
  }

  const handleFinish = async () => {
    setScoring(true)
    const interviewHistory = getInterviewHistory()
    try {
      await stop()
      if (interviewHistory.length >= 2) {
        const response = await fetch('/api/evaluate/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            interviewHistory,
            targetRole,
            mode,
            jobDescription: jobDescription.trim() || undefined,
            candidateProfile: { name: candidateName.trim() || null },
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok) setAnalysis(data)
      }
    } catch {
      /* the interview is already closed; fall through to the dashboard */
    } finally {
      setScoring(false)
    }
  }

  return (
    <div className="min-h-screen bg-midnight-navy text-cloud-white flex flex-col items-center gap-6 px-6 py-10">
      {onBack && !analysis ? (
        <button
          type="button"
          onClick={onBack}
          className="self-start px-4 py-2 text-sm text-soft-lavender hover:text-cloud-white transition-colors"
        >
          ← Back
        </button>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <h2 className="text-2xl font-semibold text-soft-lavender">Live Mock Interview</h2>
        <p className="text-sm text-slate-300 text-center max-w-xl">
          Powered by the AssemblyAI Voice Agent — speak naturally, and the interviewer answers out loud.
        </p>
      </div>

      <ConnectionState state={connectionState} detail={isLive ? statusLabel : ''} />

      {analysis ? (
        <ResultsSummary
          analysis={analysis}
          onContinue={() =>
            onFinish?.({
              analysis,
              targetRole,
              mode,
              candidateName: candidateName.trim() || null,
              completedAt: startedAt,
            })
          }
        />
      ) : null}

      {!analysis && !isLive ? (
        <div className="w-full max-w-2xl bg-slate-indigo rounded-2xl p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-soft-lavender">Target job</span>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="bg-midnight-navy text-cloud-white rounded-lg px-3 py-2 border border-slate-500/40 focus:border-voice-teal outline-none"
            >
              {TARGET_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-soft-lavender">Interview type</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="bg-midnight-navy text-cloud-white rounded-lg px-3 py-2 border border-slate-500/40 focus:border-voice-teal outline-none"
            >
              {INTERVIEW_MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-soft-lavender">Your name (optional)</span>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. Alex"
              className="bg-midnight-navy text-cloud-white rounded-lg px-3 py-2 border border-slate-500/40 focus:border-voice-teal outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="w-full max-w-2xl">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-soft-lavender">
              Job description (optional — makes the roadmap match the actual role)
            </span>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
              placeholder="Paste the job posting here so skill gaps are measured against its requirements"
              className="bg-midnight-navy text-cloud-white rounded-lg px-3 py-2 border border-slate-500/40 focus:border-voice-teal outline-none placeholder:text-slate-500"
            />
          </label>
        </div>
        </div>
      ) : null}

      {!analysis ? (
        <Transcript
          messages={messages}
          interimUser={interimUser}
          isSpeaking={connectionState === 'speaking'}
          isActive={isLive}
        />
      ) : null}

      {toolActivity.length > 0 ? (
        <div className="w-full max-w-2xl flex flex-wrap gap-2">
          {toolActivity.map((item) => (
            <span
              key={item.name}
              className={`text-xs px-3 py-1 rounded-full ${
                item.status === 'running'
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'bg-voice-teal/20 text-voice-teal'
              }`}
            >
              {item.status === 'running' ? 'Running' : 'Used'}: {item.name}
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="w-full max-w-2xl bg-coral-pulse/15 border border-coral-pulse/40 text-coral-pulse rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {!analysis ? (
        <div className="flex flex-col items-center gap-3">
          <MicButton
            state={connectionState}
            active={isLive}
            disabled={isStarting || scoring}
            onClick={isLive ? handleFinish : handleStart}
          />
          <p className="text-slate-300 text-sm">
            {isStarting && 'Requesting microphone and starting the session…'}
            {scoring && 'Scoring your interview…'}
            {!isStarting && !scoring && isLive && 'Interview in progress — the microphone is live.'}
            {!isLive && !isStarting && 'Tap to start the interview'}
          </p>
        </div>
      ) : null}

      {isLive ? (
        <button
          type="button"
          onClick={handleFinish}
          disabled={scoring || messages.length === 0}
          className="px-6 py-2 rounded-full bg-voice-teal/80 hover:bg-voice-teal text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scoring ? 'Scoring your interview…' : 'Finish Interview → View Results'}
        </button>
      ) : null}
    </div>
  )
}

export default InterviewPage
