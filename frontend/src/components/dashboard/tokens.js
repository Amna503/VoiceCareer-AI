/** Accent tones shared by the score ring, bars, chips and roadmap nodes. */
export const TONE = {
  violet: { text: 'text-brand-violet-soft', bg: 'bg-brand-violet', soft: 'bg-brand-violet/15', ring: 'from-brand-violet to-brand-indigo' },
  cyan: { text: 'text-brand-cyan', bg: 'bg-brand-cyan', soft: 'bg-brand-cyan/15', ring: 'from-brand-cyan to-brand-sky' },
  sky: { text: 'text-brand-sky', bg: 'bg-brand-sky', soft: 'bg-brand-sky/15', ring: 'from-brand-sky to-brand-indigo' },
  emerald: { text: 'text-brand-emerald', bg: 'bg-brand-emerald', soft: 'bg-brand-emerald/15', ring: 'from-brand-emerald to-brand-cyan' },
  amber: { text: 'text-brand-amber', bg: 'bg-brand-amber', soft: 'bg-brand-amber/15', ring: 'from-brand-amber to-brand-rose' },
  rose: { text: 'text-brand-rose', bg: 'bg-brand-rose', soft: 'bg-brand-rose/15', ring: 'from-brand-rose to-brand-violet' },
  slate: { text: 'text-ink-subtle', bg: 'bg-ink-faint', soft: 'bg-white/5', ring: 'from-ink-subtle to-ink-faint' },
}

export function tone(name) {
  return TONE[name] || TONE.slate
}

export function cx(...values) {
  return values.filter(Boolean).join(' ')
}
