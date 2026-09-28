import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { DashboardCard, EmptyNote, Pill } from './primitives'

/**
 * Section 4 / 5 — Strengths and Areas for Improvement.
 * Both lists come from the interview evaluation. When no interview has been
 * scored they fall back to the career engine's matched skills and open gaps,
 * so the card is never empty and never generic.
 */
export function StrengthsCard({ highlights, delay = 0 }) {
  const items = highlights.strengths

  return (
    <DashboardCard
      icon={CheckCircle2}
      eyebrow="Strengths"
      title="What you did well"
      subtitle={
        highlights.strengthsAreGaps
          ? 'Requirements this role needs that you already meet.'
          : 'Drawn from your interview evaluation.'
      }
      tone="emerald"
      delay={delay}
      action={items.length ? <Pill tone="emerald">{items.length} found</Pill> : null}
    >
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-start gap-2.5 rounded-xl border border-stroke bg-panel-inset px-3.5 py-3 transition-colors hover:border-brand-emerald/35"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-emerald" strokeWidth={2} />
              <p className="text-[13px] leading-relaxed text-ink-muted">{item}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>
          Strengths are written by the evaluator after your interview. Complete a mock interview and
          they will appear here.
        </EmptyNote>
      )}
    </DashboardCard>
  )
}

export function ImprovementsCard({ highlights, delay = 0 }) {
  const items = highlights.improvements

  return (
    <DashboardCard
      icon={AlertTriangle}
      eyebrow="Areas for Improvement"
      title="Focus on these areas"
      subtitle={
        highlights.improvementsAreGaps
          ? 'Highest-priority open gaps for your target role.'
          : 'Drawn from your interview evaluation.'
      }
      tone="rose"
      delay={delay}
      action={items.length ? <Pill tone="rose">{items.length} to work on</Pill> : null}
    >
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-start gap-2.5 rounded-xl border border-stroke bg-panel-inset px-3.5 py-3 transition-colors hover:border-brand-rose/35"
            >
              <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-rose"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-relaxed text-ink-muted">{item}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>
          Improvement areas are written by the evaluator after your interview. They will appear here
          once your session has been scored.
        </EmptyNote>
      )}
    </DashboardCard>
  )
}
