import { useId } from 'react'
import { cx, tone } from './tokens'

/**
 * The dashboard's card shell: rounded, bordered surface with an optional
 * icon, eyebrow, title, subtitle, right-hand action and animation delay.
 */
export function DashboardCard({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  action,
  tone: toneName = 'violet',
  delay = 0,
  className,
  bodyClassName,
  children,
}) {
  const accent = tone(toneName)
  return (
    <section
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cx(
        'vc-card vc-card-hover vc-rise flex flex-col overflow-hidden p-5 sm:p-6',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        {Icon ? (
          <span
            className={cx(
              'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-white/8',
              accent.soft,
              accent.text,
            )}
          >
            <Icon className="size-[18px]" strokeWidth={1.8} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="vc-eyebrow">{eyebrow}</p> : null}
          <h3 className="truncate text-[15px] font-semibold text-ink sm:text-base">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-subtle">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      <div className={cx('mt-5 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Small labelled pill used for scores, role, mode, importance bands. */
export function Pill({ tone: toneName = 'slate', icon: Icon, children, className }) {
  const accent = tone(toneName)
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border border-white/8 px-2.5 py-1 text-[11px] font-medium',
        accent.soft,
        accent.text,
        className,
      )}
    >
      {Icon ? <Icon className="size-3" strokeWidth={2.2} /> : null}
      {children}
    </span>
  )
}

/** Animated horizontal progress bar. */
export function ProgressBar({
  value,
  max = 100,
  tone: toneName = 'violet',
  height = 'h-2',
  delay = 0,
  track = 'bg-navy-800',
  className,
}) {
  const accent = tone(toneName)
  const numeric = Number(value)
  const safe = Number.isFinite(numeric) ? Math.min(max, Math.max(0, numeric)) : 0
  const percent = max > 0 ? (safe / max) * 100 : 0

  return (
    <div
      className={cx('w-full overflow-hidden rounded-full', track, height, className)}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cx(
          'h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out',
          accent.ring,
        )}
        style={{ width: `${percent}%`, transitionDelay: `${delay}ms` }}
      />
    </div>
  )
}

/**
 * Circular score indicator. Pure SVG so it stays crisp and needs no chart
 * library; `value` is a 0-100 reading from the backend evaluation.
 */
export function ScoreDonut({
  value,
  max = 100,
  size = 190,
  thickness = 14,
  from = '#7c5cff',
  to = '#22d3ee',
  track = '#1c2542',
  children,
  duration = 1100,
}) {
  const gradientId = useId()
  const numeric = Number(value)
  const hasValue = Number.isFinite(numeric)
  const safe = hasValue ? Math.min(max, Math.max(0, numeric)) : 0
  const ratio = max > 0 ? safe / max : 0

  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - ratio)

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={hasValue ? `Score ${Math.round(safe)} out of ${max}` : 'No score yet'}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={thickness}
        />
        {hasValue ? (
          <circle
            className="vc-draw"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              '--vc-draw-target': offset,
              animation: `vc-draw ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
            }}
          />
        ) : null}
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

/** Empty-state line used when a section has no data for this candidate yet. */
export function EmptyNote({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-stroke bg-panel-inset/60 px-4 py-6 text-center text-sm text-ink-subtle">
      {children}
    </p>
  )
}

/** Label + value row used in the profile and detail grids. */
export function DetailRow({ label, value, icon: Icon, tone: toneName = 'slate' }) {
  const accent = tone(toneName)
  return (
    <div className="flex items-start gap-2.5">
      {Icon ? <Icon className={cx('mt-0.5 size-4 shrink-0', accent.text)} strokeWidth={1.9} /> : null}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-ink-faint">{label}</p>
        <p className="mt-0.5 text-sm text-ink">{value ?? '—'}</p>
      </div>
    </div>
  )
}
