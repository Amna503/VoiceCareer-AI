import { BarChart3 } from 'lucide-react'
import { DashboardCard, EmptyNote, Pill, ProgressBar } from './primitives'
import { cx } from './tokens'

/**
 * Section 2 â€” Category Scores.
 * Horizontal bars, one per criterion the evaluator scored. The values are the
 * backend's own per-criterion scores re-expressed on a /100 scale.
 */
export default function CategoryScoresCard({ categories, extras, delay = 0 }) {
  const hasBars = categories.length > 0

  return (
    <DashboardCard
      icon={BarChart3}
      eyebrow="Category Scores"
      title="Where you scored"
      subtitle="Each bar is a criterion from your interview evaluation."
      tone="cyan"
      delay={delay}
      action={
        hasBars ? (
          <Pill tone="cyan">
            {categories.length} scored
          </Pill>
        ) : null
      }
    >
      {hasBars ? (
        <ul className="space-y-4">
          {categories.map((bar, index) => (
            <li key={bar.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{bar.label}</span>
                  {bar.criterion ? (
                    <span className="block truncate text-[10px] text-ink-faint">
                      Evaluated as “{bar.criterion}”
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {bar.percent}
                  <span className="text-[11px] font-normal text-ink-faint"> / 100</span>
                </span>
              </div>
              <ProgressBar
                value={bar.percent}
                tone={bar.tone}
                height="h-1.5"
                delay={index * 90}
                className="mt-2"
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>
          Category scores appear here once an interview has been evaluated. Run a mock interview to
          see Technical Knowledge, Communication, Problem Solving and Confidence scored.
        </EmptyNote>
      )}

      {extras.length ? (
        <div className="mt-5 border-t border-stroke-soft pt-4">
          <p className="vc-eyebrow">Also scored</p>
          <div className="mt-2.5 space-y-2.5">
            {extras.map((item, index) => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-ink-muted sm:w-40">
                  {item.label}
                </span>
                <ProgressBar
                  value={item.percent}
                  tone="slate"
                  height="h-1.5"
                  delay={index * 90}
                  className="flex-1"
                />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-subtle">
                  {item.percent}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasBars ? (
        <p className={cx('mt-5 border-t border-stroke-soft pt-4 text-[11px] leading-relaxed text-ink-faint')}>
          Scores are reported out of 100 for readability; the evaluator scores each criterion out of 10.
        </p>
      ) : null}
    </DashboardCard>
  )
}
