import { CalendarRange, CheckCircle2, FolderGit2, Sparkles, Target } from 'lucide-react'
import { DashboardCard, EmptyNote, Pill } from './primitives'
import { cx } from './tokens'

const NODE_TONE = ['violet', 'indigo', 'cyan', 'emerald']

function nodeToneFor(week, index) {
  if (week.kind === 'ship') return 'emerald'
  return NODE_TONE[index] || 'violet'
}

function WeekCard({ week, index, total }) {
  const toneName = nodeToneFor(week, index)
  const isLast = index === total - 1

  return (
    <li className="relative flex flex-col">
      {/* Connector line between week nodes (desktop only). */}
      {!isLast ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-[18px] hidden h-px w-4 bg-gradient-to-r from-stroke-strong to-transparent xl:block"
        />
      ) : null}

      <div className="flex h-full flex-col rounded-2xl border border-stroke bg-panel-inset p-4 transition-colors hover:border-stroke-strong sm:p-5">
        <div className="flex items-center gap-2.5">
          <span
            className={cx(
              'grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white',
              toneName === 'emerald' && 'bg-brand-emerald/85',
              toneName === 'cyan' && 'bg-brand-cyan/85',
              toneName === 'violet' && 'bg-brand-violet/85',
              toneName === 'indigo' && 'bg-brand-indigo/85',
            )}
            aria-hidden="true"
          >
            {week.week}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">Week {week.week}</p>
            <p className="line-clamp-2 text-xs font-medium leading-snug text-brand-violet-soft">
              {week.stage}
            </p>
          </div>
          {week.hours ? (
            <span className="shrink-0 rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-ink-subtle">
              {week.hours}h
            </span>
          ) : null}
        </div>

        <h4 className="mt-3.5 text-sm font-semibold leading-snug text-ink">{week.focus}</h4>

        {week.skills.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {week.skills.slice(0, 5).map((skill) => (
              <span key={skill} className="vc-chip">
                {skill}
              </span>
            ))}
          </div>
        ) : null}

        {week.goals.length ? (
          <ul className="mt-3.5 space-y-1.5">
            {week.goals.slice(0, 3).map((goal, goalIndex) => (
              <li key={`${week.key}-goal-${goalIndex}`} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[7px] size-1 shrink-0 rounded-full bg-brand-violet-soft/70"
                />
                <span className="text-[11px] leading-relaxed text-ink-muted">{goal}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {week.tasks.length ? (
          <ul className="mt-4 space-y-2">
            {week.tasks.map((task) => (
              <li key={task.key} className="flex items-start gap-2">
                <CheckCircle2
                  className="mt-[3px] size-3.5 shrink-0 text-brand-cyan/80"
                  strokeWidth={2}
                />
                <span className="min-w-0 text-xs leading-relaxed text-ink-muted">
                  {task.title}
                  {task.duration ? (
                    <span className="ml-1.5 text-[10px] text-ink-faint">{task.duration}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {week.project?.title ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-stroke bg-panel px-3 py-2.5">
            <FolderGit2 className="mt-0.5 size-3.5 shrink-0 text-brand-sky" strokeWidth={1.9} />
            <span className="min-w-0 text-[11px] leading-relaxed text-ink-subtle">
              <span className="block font-medium text-ink-muted">{week.project.title}</span>
              {week.project.description ? week.project.description : null}
            </span>
          </p>
        ) : null}

        {week.outcome ? (
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-subtle">
            <Target className="mt-0.5 size-3 shrink-0 text-brand-amber" strokeWidth={2} />
            <span>
              <span className="font-medium text-ink-muted">Expected outcome: </span>
              {week.outcome}
            </span>
          </p>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Section 7 — the 30-Day Career Roadmap, the dashboard's main section.
 * Every week, skill, task and outcome is what ai/career-engine generated for
 * this candidate's target role and prioritised gaps. Nothing here is a fixed
 * four-week template.
 */
export default function RoadmapSection({ roadmap, delay = 0, className }) {
  const { weeks, roleTitle, totalHours, hasData, consolidation, source, interviewThemes } = roadmap

  return (
    <div id="roadmap" className={cx('min-w-0 scroll-mt-24', className)}>
      <DashboardCard
        icon={CalendarRange}
        eyebrow="30-Day Career Roadmap"
        title={roleTitle ? `Your plan for ${roleTitle}` : 'Your 30-day plan'}
        subtitle={
          hasData
            ? `Four weeks, built from your target role, its requirements and your prioritised skill gaps.${
                consolidation ? ' You already cover the core requirements, so this plan adds depth.' : ''
              }`
            : 'Generate a plan from a target role to build your personalised four-week roadmap.'
        }
        tone="emerald"
        delay={delay}
        action={
          hasData ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {totalHours ? <Pill tone="emerald">{totalHours} hrs total</Pill> : null}
              {source ? <Pill tone="slate">{source}</Pill> : null}
            </div>
          ) : null
        }
      >
        {hasData ? (
          <>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {weeks.map((week, index) => (
                <WeekCard key={week.key} week={week} index={index} total={weeks.length} />
              ))}
            </ol>

            {interviewThemes.length ? (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stroke-soft pt-4">
                <Sparkles className="size-3.5 shrink-0 text-brand-violet-soft" strokeWidth={1.9} />
                <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                  What this role is assessed on
                </span>
                {interviewThemes.slice(0, 6).map((theme) => (
                  <span key={theme} className="vc-chip">
                    {theme}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyNote>
            Your roadmap is generated per candidate by the career engine from the target role, its
            requirements, your skills and your interview evaluation. Pick a role above and generate a
            plan to see it here.
          </EmptyNote>
        )}
      </DashboardCard>
    </div>
  )
}
