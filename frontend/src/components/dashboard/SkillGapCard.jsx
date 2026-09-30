import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GitCompareArrows } from 'lucide-react'
import { DashboardCard, EmptyNote, MeterBar, Pill } from './primitives'
import { cx } from './tokens'

const YOUR_LEVEL = '#7c5cff'
const REQUIRED_LEVEL = '#22d3ee'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-xl border border-stroke-strong bg-navy-900/95 px-3 py-2.5 shadow-xl backdrop-blur">
      <p className="text-xs font-medium text-ink">{label}</p>
      {row ? (
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
          {row.importanceLabel}
          {row.currentLevel ? ` · currently ${row.currentLevel}` : ''}
        </p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink-subtle">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{entry.value}</span>
          </li>
        ))}
      </ul>
      {row?.suggestedImprovement ? (
        <p className="mt-2 max-w-[15rem] border-t border-stroke pt-2 text-[10px] leading-relaxed text-ink-subtle">
          {row.suggestedImprovement}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Section 6 — Skill Gap Analysis.
 * Candidate level vs the level the target role requires. The required bar is
 * the importance band the role catalog assigned; the candidate bar is the
 * level the analyzer estimated. Both come from the career engine.
 *
 * The card spans the full dashboard width: the comparison chart on the left,
 * the ranked gaps (with what to do about each one) on the right.
 */
export default function SkillGapCard({ comparison, delay = 0, className }) {
  const { rows, gapCount, totalRequired, readiness, hasData } = comparison
  const ranked = rows.slice(0, 6)

  return (
    <DashboardCard
      icon={GitCompareArrows}
      eyebrow="Skill Gap Analysis"
      title="Your level vs the role"
      subtitle={
        hasData
          ? `${gapCount} of ${totalRequired} requirements outstanding${
              readiness !== null && readiness !== undefined ? ` · ${readiness}% readiness` : ''
            }`
          : 'Generate a plan to compare your skills against the role requirements.'
      }
      tone="sky"
      delay={delay}
      className={className}
      action={readiness !== null && readiness !== undefined ? <Pill tone="sky">{readiness}% ready</Pill> : null}
    >
      {hasData ? (
        <div className="grid flex-1 gap-x-8 gap-y-5 lg:grid-cols-12 lg:gap-y-2">
          <div className="lg:col-span-7">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -18 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 4" stroke="#1c2542" vertical={false} />
                  <XAxis
                    dataKey="skill"
                    tick={{ fill: '#6f7ba3', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#212b4d' }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={78}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: '#4d5878', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: '#a3add0', paddingBottom: 8 }}
                  />
                  <Bar
                    dataKey="required"
                    name="Required Level"
                    fill={REQUIRED_LEVEL}
                    fillOpacity={0.28}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar dataKey="current" name="Your Level" radius={[4, 4, 0, 0]} maxBarSize={18}>
                    {rows.map((row) => (
                      <Cell
                        key={row.skill}
                        fill={YOUR_LEVEL}
                        fillOpacity={row.isGap ? 1 : 0.45}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <ul className="flex flex-col justify-between gap-3 lg:col-span-5 lg:gap-4">
            {ranked.map((row) => {
              const shortfall = Math.max(0, row.required - row.current)
              return (
                <li key={row.skill} className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cx(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          row.isGap ? 'bg-brand-rose' : 'bg-brand-emerald',
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-ink-muted">{row.skill}</span>
                        <span className="block text-[10px] uppercase tracking-wider text-ink-faint">
                          {row.importanceLabel}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-ink-subtle">
                      <span className={row.isGap ? 'text-brand-rose' : 'text-brand-emerald'}>
                        {row.current}
                      </span>
                      <span className="text-ink-faint"> / {row.required}</span>
                      {shortfall > 0 ? (
                        <span className="ml-1.5 text-ink-faint">−{shortfall}</span>
                      ) : null}
                    </span>
                  </div>
                  <MeterBar
                    value={row.current}
                    marker={row.required}
                    tone={row.isGap ? 'violet' : 'emerald'}
                    markerTone="cyan"
                    height="h-1.5"
                    label={`${row.skill}: you are at ${row.current}, the role requires ${row.required}`}
                  />
                  {row.suggestedImprovement ? (
                    <p className="line-clamp-2 pl-3.5 text-[11px] leading-relaxed text-ink-subtle">
                      {row.suggestedImprovement}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <p className="text-[11px] leading-relaxed text-ink-faint lg:col-span-12">
            The filled bar is your current level; the teal marker is the level this role requires.
            {rows.length > ranked.length ? ` Showing the ${ranked.length} highest-impact of ${rows.length} skills compared.` : ''}
          </p>
        </div>
      ) : (
        <EmptyNote>
          Skill comparison is generated from your target role's requirements, your stated skills and
          your interview evaluation. Choose a role and generate a plan to populate it.
        </EmptyNote>
      )}
    </DashboardCard>
  )
}
