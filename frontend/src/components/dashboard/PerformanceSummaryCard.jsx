import { Quote, Sparkles } from 'lucide-react'
import { DashboardCard, EmptyNote, ProgressBar } from './primitives'
import { cx } from './tokens'

const SIGNAL_TONE = {
  violet: 'bg-brand-violet',
  cyan: 'bg-brand-cyan',
  sky: 'bg-brand-sky',
  emerald: 'bg-brand-emerald',
  amber: 'bg-brand-amber',
  rose: 'bg-brand-rose',
  slate: 'bg-ink-faint',
}

/**
 * Section 3 â€” Performance Summary ("Your Performance").
 * The narrative is assembled from the real score, the strongest/weakest scored
 * criterion, role readiness and the candidate's own top gaps, so it is never
 * the same paragraph for two candidates.
 */
export default function PerformanceSummaryCard({ performance, delay = 0 }) {
  if (!performance.available) {
    return (
      <DashboardCard
        icon={Sparkles}
        eyebrow="Your Performance"
        title="Performance summary"
        tone="violet"
        delay={delay}
      >
        <EmptyNote>{performance.body}</EmptyNote>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      icon={Sparkles}
      eyebrow="Your Performance"
      title={performance.headline}
      tone="violet"
      delay={delay}
      action={
        performance.percent !== null ? (
          <span className="text-lg font-semibold tabular-nums text-ink">
            {performance.percent}
            <span className="text-[11px] font-normal text-ink-faint">/100</span>
          </span>
        ) : null
      }
    >
      {performance.percent !== null ? (
        <ProgressBar value={performance.percent} tone="violet" height="h-1.5" className="mb-4" />
      ) : null}

      <p className="text-[13px] leading-relaxed text-ink-muted">{performance.body}</p>

      {performance.quote ? (
        <blockquote className="mt-4 flex gap-2.5 rounded-xl border border-stroke bg-panel-inset px-3.5 py-3">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-brand-violet-soft" strokeWidth={2} />
          <p className="line-clamp-4 text-xs leading-relaxed text-ink-subtle">{performance.quote}</p>
        </blockquote>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {performance.signals.map((signal) => (
          <div
            key={signal.key}
            className="rounded-xl border border-stroke bg-panel-inset px-3 py-2.5"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cx('size-1.5 rounded-full', SIGNAL_TONE[signal.tone] || SIGNAL_TONE.slate)}
                aria-hidden="true"
              />
              <p className="truncate text-[10px] uppercase tracking-wider text-ink-faint">
                {signal.label}
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{signal.value}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}
