import {
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Layers,
  Mic,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { DashboardCard, DetailRow, EmptyNote, Pill, ProgressBar } from './primitives'
import { cx } from './tokens'

/** Sidebar "Profile" view — the candidate's career profile, entirely backend data. */
export function ProfilePanel({ profile, skillComparison, delay = 0 }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <DashboardCard
        icon={UserRound}
        eyebrow="Profile"
        title={profile.displayName || 'Candidate'}
        subtitle={profile.roleTitle ? `Targeting ${profile.roleTitle}` : 'No target role chosen yet.'}
        tone="violet"
        delay={delay}
        className="lg:col-span-1"
        action={<Pill tone="violet">{profile.roleKey || 'unset'}</Pill>}
      >
        <div className="space-y-4">
          <DetailRow label="Target Role" icon={Target} tone="violet" value={profile.roleTitle} />
          <DetailRow
            label="Experience Level"
            icon={GraduationCap}
            tone="cyan"
            value={profile.experience}
          />
          <DetailRow
            label="Interview Type"
            icon={Mic}
            tone="sky"
            value={profile.modeLabel || profile.interviewType}
          />
          <DetailRow
            label="Interviewed"
            icon={CalendarClock}
            tone="emerald"
            value={profile.timestampLabel || 'Not yet'}
          />
          <DetailRow
            label="Skills Source"
            icon={Layers}
            tone="amber"
            value={profile.skillsSource ? profile.skillsSource.replace(/-/g, ' ') : 'Not recorded'}
          />
        </div>

        {profile.readiness !== null && profile.readiness !== undefined ? (
          <div className="mt-5 border-t border-stroke-soft pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-muted">Role readiness</span>
              <span className="text-sm font-semibold tabular-nums text-ink">{profile.readiness}%</span>
            </div>
            <ProgressBar value={profile.readiness} tone="violet" height="h-1.5" className="mt-2" />
            <p className="mt-2 text-[11px] text-ink-faint">
              {profile.matchedSkills.length} of {profile.totalRequired ?? 0} requirements covered
              {profile.gapCount !== null ? ` · ${profile.gapCount} gaps open` : ''}
            </p>
          </div>
        ) : null}
      </DashboardCard>

      <DashboardCard
        icon={BadgeCheck}
        eyebrow="Skills"
        title="Skills on record"
        subtitle="Every skill listed here was matched against this role's requirements."
        tone="emerald"
        delay={delay + 60}
        className="lg:col-span-1"
      >
        <div className="space-y-4">
          <div>
            <p className="vc-eyebrow">Current skills</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.currentSkills.length ? (
                profile.currentSkills.map((skill) => (
                  <span key={skill} className="vc-chip">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-ink-faint">
                  None recorded — skills are inferred from your transcript until you add them.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-stroke-soft pt-4">
            <p className="vc-eyebrow">Covered for this role</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.matchedSkills.length ? (
                profile.matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-emerald/25 bg-brand-emerald/12 px-2.5 py-1 text-[11px] text-brand-emerald"
                  >
                    <BadgeCheck className="size-3" strokeWidth={2.2} />
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-ink-faint">No requirements covered yet.</p>
              )}
            </div>
          </div>

          {skillComparison.gapCount ? (
            <div className="border-t border-stroke-soft pt-4">
              <p className="vc-eyebrow">Open gaps</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(skillComparison.rows || [])
                  .filter((row) => row.isGap)
                  .slice(0, 8)
                  .map((row) => (
                    <span
                      key={row.skill}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-rose/25 bg-brand-rose/12 px-2.5 py-1 text-[11px] text-brand-rose"
                    >
                      {row.skill}
                      <span className="text-brand-rose/70">{row.importanceLabel}</span>
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard
        icon={Sparkles}
        eyebrow="Coach Feedback"
        title="Detailed evaluation"
        tone="cyan"
        delay={delay + 120}
        className="lg:col-span-1"
      >
        {profile.detailedFeedback ? (
          <p className="max-h-[22rem] overflow-y-auto text-[13px] leading-relaxed text-ink-muted vc-scroll">
            {profile.detailedFeedback}
          </p>
        ) : profile.gapSummary ? (
          <p className="text-[13px] leading-relaxed text-ink-muted">{profile.gapSummary}</p>
        ) : (
          <EmptyNote>
            Detailed feedback is written by the evaluator once an interview has been scored.
          </EmptyNote>
        )}
      </DashboardCard>
    </div>
  )
}

/** Sidebar "Settings" view — which surfaces are powered by which engine. */
export function SettingsPanel({ profile, roadmap, skillGaps, delay = 0 }) {
  const sources = roadmap?.generatedFrom || []
  const readable = {
    'target-role': 'Target role',
    'role-requirements': 'Role requirements',
    'candidate-skills': 'Your skills',
    'skill-gaps': 'Prioritised skill gaps',
    'interview-evaluation': 'Interview evaluation',
    'job-description': 'Job description',
    'experience-level': 'Experience level',
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <DashboardCard
        icon={Sparkles}
        eyebrow="Settings"
        title="Analysis sources"
        subtitle="Everything on this dashboard is generated at request time — nothing is a fixed template."
        tone="violet"
        delay={delay}
      >
        <ul className="space-y-3">
          {[
            {
              label: 'Scoring & evaluation',
              value: 'ai/evaluation + CoachAgent — scored from your real transcript',
              live: Boolean(skillGaps) || profile.timestamp !== null,
            },
            {
              label: 'Role requirements',
              value: 'ai/career-engine/roleCatalog.js — resolved from your target role',
              live: Boolean(skillGaps),
            },
            {
              label: 'Skill gap analysis',
              value: 'ai/career-engine/skillGap.js — ranked by importance, job description and interview',
              live: Boolean(skillGaps),
            },
            {
              label: '30-day roadmap',
              value: 'ai/career-engine/roadmap.js — composed from your ranked gaps',
              live: roadmap?.hasData,
            },
            {
              label: 'Voice interview',
              value: 'AssemblyAI Voice Agent — live audio, live transcript, adaptive questions',
              live: true,
            },
          ].map((row) => (
            <li
              key={row.label}
              className="flex items-start gap-3 rounded-xl border border-stroke bg-panel-inset px-3.5 py-3"
            >
              <span
                className={cx(
                  'mt-1.5 size-1.5 shrink-0 rounded-full',
                  row.live ? 'bg-brand-emerald' : 'bg-ink-faint',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">{row.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-subtle">{row.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>

      <DashboardCard
        icon={Target}
        eyebrow="Settings"
        title="Current analysis"
        tone="cyan"
        delay={delay + 60}
      >
        <div className="space-y-4">
          <DetailRow label="Target role" icon={Target} tone="violet" value={profile.roleTitle} />
          <DetailRow label="Role key" tone="slate" value={profile.roleKey} />
          <DetailRow label="Experience level" tone="cyan" value={profile.experience} />
          <DetailRow label="Interview type" tone="sky" value={profile.modeLabel || profile.interviewType} />
          <DetailRow
            label="Analysis built from"
            tone="emerald"
            value={
              sources.length
                ? sources.map((item) => readable[item] || item).join(', ')
                : 'Nothing generated yet'
            }
          />
          <DetailRow
            label="Plan source"
            tone="amber"
            value={roadmap?.source || 'Not generated'}
          />
        </div>

        <p className="mt-5 border-t border-stroke-soft pt-4 text-[11px] leading-relaxed text-ink-faint">
          Change your target role or add the skills you already have from the dashboard's plan
          generator — the roadmap, gaps and recommendations are rebuilt for that role.
        </p>
      </DashboardCard>
    </div>
  )
}
