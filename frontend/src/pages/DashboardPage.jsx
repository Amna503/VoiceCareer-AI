import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from '../components/dashboard/AppShell'
import OverallScoreCard from '../components/dashboard/OverallScoreCard'
import CategoryScoresCard from '../components/dashboard/CategoryScoresCard'
import PerformanceSummaryCard from '../components/dashboard/PerformanceSummaryCard'
import { ImprovementsCard, StrengthsCard } from '../components/dashboard/HighlightsCards'
import { apiUrl } from '../lib/api'
import SkillGapCard from '../components/dashboard/SkillGapCard'
import RoadmapSection from '../components/dashboard/RoadmapSection'
import NextStepsCard from '../components/dashboard/NextStepsCard'
import { ProfilePanel, SettingsPanel } from '../components/dashboard/ProfilePanels'
import PlanGenerator from '../components/dashboard/PlanGenerator'
import { buildDashboardModel } from '../lib/dashboardData'

const HEADER_SUBTITLES = {
  home: 'Speak. Practice. Improve. Build your career.',
  interview: 'Live mock interview with the AssemblyAI Voice Agent.',
  dashboard: "Here's your interview performance summary and personalized next steps.",
  roadmap: 'Your personalised four-week plan, built from your skill gaps.',
  profile: 'Your career profile, skills and role readiness.',
  settings: 'What generates each part of this dashboard.',
}

/**
 * Career Dashboard.
 *
 * Every number, list, bar and week on this page is produced by the backend
 * (ai/evaluation + ai/career-engine) and reshaped by lib/dashboardData.js.
 * This file contains no score, role, skill, roadmap or recommendation of its
 * own.
 */
export default function DashboardPage({ result, onBack, onNavigate, activeView = 'dashboard' }) {
  // `generated` is what the plan generator below produced. The interview result
  // always wins, so finishing a new interview replaces a generated plan.
  const [generated, setGenerated] = useState(null)
  const data = result?.analysis || generated
  const targetRole = result?.targetRole || data?.targetRole || 'frontend'

  const [role, setRole] = useState(targetRole)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // The role catalogue comes from the backend so the UI never hardcodes a list.
  useEffect(() => {
    let active = true
    fetch(apiUrl('/api/evaluate/roles'))
      .then((response) => (response.ok ? response.json() : null))
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

  const generate = useCallback(
    async (skills) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(apiUrl('/api/evaluate/dashboard'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetRole: role, skills }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Could not generate your plan')
        setGenerated(payload)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [role],
  )

  const model = useMemo(
    () =>
      buildDashboardModel({
        data,
        result,
        candidateName: result?.candidateName,
        completedAt: result?.completedAt,
      }),
    [data, result],
  )

  const { profile } = model

  const greetingName = profile.firstName || null
  const subtitle = HEADER_SUBTITLES[activeView] || HEADER_SUBTITLES.dashboard

  const body = () => {
    if (activeView === 'profile') {
      return <ProfilePanel profile={profile} skillComparison={model.skillComparison} />
    }

    if (activeView === 'settings') {
      return (
        <SettingsPanel profile={profile} roadmap={model.roadmap} skillGaps={model.skillGaps} />
      )
    }

    if (activeView === 'roadmap') {
      return (
        <div className="space-y-5">
          <PlanGenerator
            roles={roles}
            role={role}
            onRoleChange={setRole}
            onGenerate={generate}
            loading={loading}
            error={error}
          />
          <RoadmapSection roadmap={model.roadmapView} />
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <PlanGenerator
          roles={roles}
          role={role}
          onRoleChange={setRole}
          onGenerate={generate}
          loading={loading}
          error={error}
        />

        <div className="grid w-full grid-cols-12 items-stretch gap-5">
          <OverallScoreCard
            overall={model.overall}
            profile={profile}
            className="col-span-12 lg:col-span-4"
            delay={0}
          />
          <CategoryScoresCard
            categories={model.categories}
            extras={model.categoryExtras}
            className="col-span-12 lg:col-span-8"
            delay={60}
          />

          <PerformanceSummaryCard
            performance={model.performance}
            className="col-span-12 md:col-span-6"
            delay={120}
          />
          <StrengthsCard
            highlights={model.highlights}
            className="col-span-12 md:col-span-6"
            delay={180}
          />
          <ImprovementsCard
            highlights={model.highlights}
            className="col-span-12 md:col-span-6"
            delay={240}
          />
          <NextStepsCard
            nextSteps={model.nextSteps}
            className="col-span-12 md:col-span-6"
            delay={300}
          />

          <SkillGapCard
            comparison={model.skillComparison}
            className="col-span-12"
            delay={360}
          />

          <RoadmapSection
            roadmap={model.roadmapView}
            className="col-span-12"
            delay={420}
          />
        </div>

        {onBack ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-stroke bg-panel px-4 py-2 text-[13px] text-ink-muted transition-colors hover:border-stroke-strong hover:text-ink"
            >
              ← Start a new interview
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <AppShell
      active={activeView === 'roadmap' ? 'roadmap' : activeView}
      onNavigate={onNavigate}
      greetingName={greetingName}
      subtitle={subtitle}
      interviewTimestampLabel={profile.timestampLabel}
      profile={{ ...profile, hasInterviews: profile.hasInterviews }}
    >
      {body()}
    </AppShell>
  )
}
