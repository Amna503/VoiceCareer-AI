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
import { DashboardCard, EmptyNote, Pill, ProgressBar } from './primitives'
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
 */
export default function SkillGapCard({ comparison, delay = 0, className }) {
  const { rows, gapCount, totalRequired, readiness, hasData } = comparison

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
        <>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: -22 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 4" stroke="#1c2542" vertical={false} />
                <XAxis
                  dataKey="skill"
                  tick={{ fill: '#6f7ba3', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#212b4d' }}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={62}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: '#4d5878', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 11, color: '#a3add0', paddingBottom: 6 }}
                />
                <Bar
                  dataKey="required"
                  name="Required Level"
                  fill={REQUIRED_LEVEL}
                  fillOpacity={0.28}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                />
                <Bar dataKey="current" name="Your Level" radius={[4, 4, 0, 0]} maxBarSize={16}>
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

          <ul className="mt-5 space-y-3 border-t border-stroke-soft pt-4">
            {rows.slice(0, 5).map((row) => {
              const shortfall = Math.max(0, row.required - row.current)
              return (
                <li key={row.skill}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cx(
                          'size-1.5 shrink-0 rounded-full',
                          row.isGap ? 'bg-brand-rose' : 'bg-brand-emerald',
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate text-xs text-ink-muted">{row.skill}</span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-ink-subtle">
                      {row.current} / {row.required}
                      {shortfall > 0 ? (
                        <span className="ml-1.5 text-brand-rose">→{shortfall}</span>
                      ) : (
                        <span className="ml-1.5 text-brand-emerald">met</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <ProgressBar value={row.current} tone={row.isGap ? 'violet' : 'emerald'} height="h-1" className="flex-1" />
                    <ProgressBar value={row.required} tone="cyan" height="h-1" className="flex-1" track="bg-navy-800/60" />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <EmptyNote>
          Skill comparison is generated from your target role's requirements, your stated skills and
          your interview evaluation. Choose a role and generate a plan to populate it.
        </EmptyNote>
      )}
    </DashboardCard>
  )
}
