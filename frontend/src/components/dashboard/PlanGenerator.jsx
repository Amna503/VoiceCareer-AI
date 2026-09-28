import { useState } from 'react'
import { Loader2, RefreshCw, Wand2 } from 'lucide-react'
import { cx } from './tokens'

/**
 * Plan generator â€” the same call the dashboard has always made
 * (POST /api/evaluate/dashboard), restyled to match the new shell. Rebuilds the
 * skill gaps and roadmap for a different role without touching the interview.
 */
export default function PlanGenerator({ roles, role, onRoleChange, onGenerate, loading, error }) {
  const [open, setOpen] = useState(false)
  const [skillsInput, setSkillsInput] = useState('')

  const submit = (event) => {
    event.preventDefault()
    onGenerate(
      skillsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
  }

  return (
    <section className="vc-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
        aria-expanded={open}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-violet/15 text-brand-violet-soft">
          <Wand2 className="size-4" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-ink">Rebuild my plan for a different role</span>
          <span className="block truncate text-[11px] text-ink-subtle">
            Re-runs the career engine against the role requirements â€” your interview data is kept.
          </span>
        </span>
        <RefreshCw
          className={cx(
            'size-4 shrink-0 text-ink-subtle transition-transform duration-300',
            open && 'rotate-180',
          )}
          strokeWidth={1.9}
        />
      </button>

      {open ? (
        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-3 border-t border-stroke-soft px-4 py-4 sm:grid-cols-3 sm:px-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="vc-eyebrow">Target job</span>
            <select
              value={role}
              onChange={(event) => onRoleChange(event.target.value)}
              disabled={loading}
              className="vc-input"
            >
              {(roles.length
                ? roles.map((item) => ({ value: item.key, label: item.title }))
                : [{ value: role, label: role }]
              ).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="vc-eyebrow">Your current skills (comma separated)</span>
            <input
              type="text"
              value={skillsInput}
              onChange={(event) => setSkillsInput(event.target.value)}
              placeholder="e.g. JavaScript, HTML, CSS"
              disabled={loading}
              className="vc-input"
            />
          </label>

          <div className="flex items-center gap-3 sm:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-indigo px-4 py-2 text-[13px] font-medium text-white shadow-[0_14px_30px_-16px_rgba(124,92,255,0.9)] transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? 'Generating your planâ€¦' : 'Generate my 30-day plan'}
            </button>
          </div>

          {error ? (
            <p className="sm:col-span-3 rounded-xl border border-brand-rose/35 bg-brand-rose/12 px-3.5 py-2.5 text-xs text-brand-rose">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}
