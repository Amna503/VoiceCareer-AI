import { Award, Mic, Sparkles, Target, TrendingUp } from 'lucide-react'
import { DashboardCard, DetailRow, EmptyNote, Pill, ScoreDonut } from './primitives'
import { cx } from './tokens'

/**
 * Section 1 — Overall Performance.
 * Score, label, target role, experience level and interview type all come
 * straight from the scored interview payload.
 */
export default function OverallScoreCard({ overall, profile, delay = 0, className }) {
  const hasScore = overall.hasScore

  return (
    <DashboardCard
      icon={Award}
      eyebrow="Overall Performance"
      title={hasScore ? `${overall.score} / ${overall.max}` : 'Not scored yet'}
      subtitle={
        hasScore
          ? 'Weighted across every criterion the evaluator scored.'
          : 'Complete a voice interview to score this session.'
      }
      tone={overall.tone}
      delay={delay}
      className={className}
      action={hasScore ? <Pill tone={overall.tone}>{overall.label || 'Scored'}</Pill> : null}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreDonut
          value={hasScore ? overall.score : 0}
          max={overall.max}
          size={168}
          thickness={13}
          from={overall.ringFrom}
          to={overall.ringTo}
        >
          <div className="leading-none">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">Score</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {hasScore ? overall.score : '—'}
            </p>
            <p className="mt-1 text-[11px] text-ink-subtle">
              {hasScore ? `out of ${overall.max}` : 'awaiting interview'}
            </p>
          </div>
        </ScoreDonut>

        <div className="w-full min-w-0 flex-1 space-y-3.5">
          <DetailRow
            label="Target Role"
            icon={Target}
            tone="violet"
            value={profile.roleTitle || 'Not set'}
          />
          <DetailRow
            label="Experience Level"
            icon={TrendingUp}
            tone="cyan"
            value={profile.experience || 'Not recorded'}
          />
          <DetailRow
            label="Interview Type"
            icon={Mic}
            tone="sky"
            value={profile.modeLabel || profile.interviewType || 'Voice Interview'}
          />

          {profile.timestampLabel ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Pill tone="slate" icon={Sparkles}>
                {profile.dateLabel}
              </Pill>
              <Pill tone="slate">{profile.timeLabel}</Pill>
            </div>
          ) : null}
        </div>
      </div>

      {!hasScore ? (
        <div className="mt-5">
          <EmptyNote>
            Overall score, category scores, strengths and improvement areas all come from your
            interview evaluation. Start a voice interview to populate them.
          </EmptyNote>
        </div>
      ) : null}

      {hasScore ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-stroke bg-panel-inset px-3.5 py-2.5">
          <span className={cx('text-xs font-semibold', overall.tone === 'rose' ? 'text-brand-rose' : 'text-ink-muted')}>
            {overall.label}
          </span>
          <span className="h-3 w-px bg-stroke" aria-hidden="true" />
          <p className="text-xs text-ink-subtle">
            {profile.readiness !== null && profile.readiness !== undefined
              ? `${profile.readiness}% of ${profile.roleTitle || 'role'} requirements covered.`
              : 'Scored from your transcript.'}
          </p>
        </div>
      ) : null}
    </DashboardCard>
  )
}
