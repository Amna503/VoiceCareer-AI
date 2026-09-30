import { Award, CalendarClock, Mic, Target, TrendingUp } from 'lucide-react'
import { DashboardCard, EmptyNote, Pill, ScoreDonut } from './primitives'
import { cx, tone } from './tokens'

/** Compact label/value line — stays on one row in a narrow card, never truncates. */
function MetaRow({ label, value, icon: Icon, tone: toneName = 'slate' }) {
  const accent = tone(toneName)
  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5">
      {Icon ? (
        <Icon className={cx('mt-0.5 size-4 shrink-0', accent.text)} strokeWidth={1.9} />
      ) : (
        <span className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <dt className="mt-px text-[11px] uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className="ml-auto min-w-0 max-w-[58%] text-right text-[13px] font-medium leading-snug text-ink">
        {value ?? '—'}
      </dd>
    </div>
  )
}

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
      tone={overall.tone === 'none' ? 'violet' : overall.tone}
      delay={delay}
      className={className}
      action={hasScore ? <Pill tone={overall.tone}>{overall.label || 'Scored'}</Pill> : null}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
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

        <dl className="w-full divide-y divide-stroke-soft overflow-hidden rounded-xl border border-stroke bg-panel-inset">
          <MetaRow
            label="Target Role"
            icon={Target}
            tone="violet"
            value={profile.roleTitle || 'Not set'}
          />
          <MetaRow
            label="Experience"
            icon={TrendingUp}
            tone="cyan"
            value={profile.experience || 'Not recorded'}
          />
          <MetaRow
            label="Interview"
            icon={Mic}
            tone="sky"
            value={profile.modeLabel || profile.interviewType || 'Voice Interview'}
          />
          {profile.timestampLabel ? (
            <MetaRow
              label="Completed"
              icon={CalendarClock}
              tone="emerald"
              value={`${profile.dateLabel} · ${profile.timeLabel}`}
            />
          ) : null}
        </dl>
      </div>

      {!hasScore ? (
        <div className="mt-5 flex">
          <EmptyNote>
            Overall score, category scores, strengths and improvement areas all come from your
            interview evaluation. Start a voice interview to populate them.
          </EmptyNote>
        </div>
      ) : null}

      {hasScore ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-stroke bg-panel-inset px-3.5 py-2.5">
          <span className={cx('shrink-0 text-xs font-semibold', overall.tone === 'rose' ? 'text-brand-rose' : 'text-ink-muted')}>
            {overall.label}
          </span>
          <span className="h-3 w-px shrink-0 bg-stroke" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-ink-subtle">
            {profile.readiness !== null && profile.readiness !== undefined
              ? `${profile.readiness}% of ${profile.roleTitle || 'role'} requirements covered.`
              : 'Scored from your transcript.'}
          </p>
        </div>
      ) : null}
    </DashboardCard>
  )
}
