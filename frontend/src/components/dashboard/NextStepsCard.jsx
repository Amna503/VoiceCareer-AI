import { ListOrdered, Sparkles } from 'lucide-react'
import { DashboardCard, EmptyNote, Pill } from './primitives'
import { cx } from './tokens'

const ORIGIN_TONE = {
  'Skill gap': 'violet',
  Interview: 'cyan',
  '30-day plan': 'emerald',
  Portfolio: 'sky',
  'Role fit': 'amber',
  Practice: 'violet',
  Strength: 'emerald',
  slate: 'slate',
}

/**
 * Section 8 â€” Recommended Next Steps.
 * Every item is derived from this candidate's ranked skill gaps, their interview
 * evaluation and their own roadmap weeks, and each one is tagged with the
 * signal it came from â€” so the list is visibly personal, never a fixed set.
 */
export default function NextStepsCard({ nextSteps, delay = 0 }) {
  const { steps, hasSteps, fallback } = nextSteps

  return (
    <DashboardCard
      icon={ListOrdered}
      eyebrow="Recommended Next Steps"
      title="Do these next"
      subtitle="Ranked from your skill gaps, interview feedback and your own plan."
      tone="amber"
      delay={delay}
      action={hasSteps ? <Pill tone="amber">{steps.length} steps</Pill> : null}
    >
      {hasSteps ? (
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="group flex gap-3 rounded-xl border border-stroke bg-panel-inset p-3.5 transition-colors hover:border-stroke-strong"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-violet/30 to-brand-indigo/20 text-[11px] font-bold tabular-nums text-brand-violet-soft">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug text-ink">{step.title}</p>
                {step.detail ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-subtle">{step.detail}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Pill tone={ORIGIN_TONE[step.origin] || 'slate'}>{step.origin}</Pill>
                  {step.meta ? <Pill tone="slate">{step.meta}</Pill> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyNote>{fallback}</EmptyNote>
      )}

      <p className={cx('mt-4 flex items-start gap-1.5 border-t border-stroke-soft pt-3.5 text-[10px] leading-relaxed text-ink-faint')}>
        <Sparkles className="mt-px size-3 shrink-0 text-brand-violet-soft" strokeWidth={2} />
        Each step links back to the signal that produced it, so the list changes with every interview.
      </p>
    </DashboardCard>
  )
}
