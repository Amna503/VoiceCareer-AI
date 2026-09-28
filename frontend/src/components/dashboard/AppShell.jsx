import { useEffect, useState } from 'react'
import {
  Bell,
  CalendarClock,
  Home,
  LayoutDashboard,
  Map,
  Menu,
  Mic,
  Settings,
  User,
  X,
} from 'lucide-react'
import { cx } from './tokens'

const NAV = [
  { id: 'home', label: 'Home', icon: Home, section: null },
  { id: 'interview', label: 'Interview', icon: Mic, section: null },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: null },
  { id: 'roadmap', label: 'Career Roadmap', icon: Map, section: 'roadmap' },
  { id: 'profile', label: 'Profile', icon: User, section: null },
  { id: 'settings', label: 'Settings', icon: Settings, section: null },
]

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-violet to-brand-cyan shadow-[0_10px_24px_-12px_rgba(124,92,255,0.9)]">
        <Mic className="size-[18px] text-white" strokeWidth={2.2} />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-ink">
            VoiceCareer <span className="text-brand-violet-soft">AI</span>
          </span>
          <span className="block truncate text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Career Intelligence
          </span>
        </span>
      ) : null}
    </div>
  )
}

function NavList({ active, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id, item.section)}
            aria-current={isActive ? 'page' : undefined}
            className={cx(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'bg-gradient-to-r from-brand-violet/20 to-transparent text-ink'
                : 'text-ink-subtle hover:bg-white/5 hover:text-ink',
            )}
          >
            {isActive ? (
              <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-brand-violet to-brand-cyan" />
            ) : null}
            <item.icon
              className={cx(
                'size-[18px] shrink-0 transition-colors',
                isActive ? 'text-brand-violet-soft' : 'text-ink-faint group-hover:text-ink-subtle',
              )}
              strokeWidth={1.9}
            />
            <span className="truncate">{item.label}</span>
            {isActive ? (
              <span className="ml-auto size-1.5 rounded-full bg-brand-cyan" aria-hidden="true" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function SidebarBody({ active, onNavigate, onClose }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <Brand />
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-white/5 hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-[18px]" />
          </button>
        ) : null}
      </div>

      <NavList active={active} onNavigate={onNavigate} />

      <div className="mt-auto rounded-2xl border border-stroke bg-panel-inset p-4">
        <p className="vc-eyebrow">Live voice mode</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-subtle">
          Interviews run over the AssemblyAI Voice Agent — your transcript and score are generated from
          the real conversation.
        </p>
      </div>
    </div>
  )
}

/**
 * Dashboard chrome: fixed sidebar on desktop, slide-in drawer on mobile, and a
 * top header carrying the greeting, interview date/time and avatar.
 */
export default function AppShell({
  active,
  onNavigate,
  greetingName,
  subtitle,
  profile,
  interviewTimestampLabel,
  children,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navigate = (id, section) => {
    setDrawerOpen(false)
    onNavigate(id, section)
  }

  return (
    <div className="min-h-screen bg-navy-950 text-ink">
      {/* Ambient background wash — subtle, non-animated. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(1100px_600px_at_15%_-10%,rgba(124,92,255,0.16),transparent_60%),radial-gradient(900px_520px_at_100%_0%,rgba(34,211,238,0.10),transparent_55%)]"
      />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-stroke bg-navy-900/90 backdrop-blur-xl lg:block">
        <SidebarBody active={active} onNavigate={navigate} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="vc-fade absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 w-[268px] border-r border-stroke bg-navy-900 shadow-2xl">
            <SidebarBody active={active} onNavigate={navigate} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="relative lg:pl-[248px]">
        {/* Top header */}
        <header className="sticky top-0 z-20 border-b border-stroke bg-navy-950/85 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-stroke text-ink-subtle transition-colors hover:bg-white/5 hover:text-ink lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-[18px]" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink sm:text-lg">
                {greetingName ? `Hello, ${greetingName} 👋` : 'Hello 👋'}
              </h1>
              <p className="mt-0.5 hidden truncate text-xs text-ink-subtle sm:block">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {interviewTimestampLabel ? (
                <div className="hidden items-center gap-2 rounded-xl border border-stroke bg-panel px-3 py-2 sm:flex">
                  <CalendarClock className="size-4 text-brand-violet-soft" strokeWidth={1.9} />
                  <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">Interview</p>
                    <p className="whitespace-nowrap text-xs text-ink-muted">{interviewTimestampLabel}</p>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-stroke text-ink-subtle transition-colors hover:bg-white/5 hover:text-ink"
                aria-label="Notifications"
              >
                <Bell className="size-[18px]" strokeWidth={1.9} />
                {profile?.hasInterviews ? (
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-rose" aria-hidden="true" />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => navigate('profile')}
                className="flex items-center gap-2.5 rounded-xl border border-stroke bg-panel py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-stroke-strong sm:pr-3"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-violet to-brand-indigo text-[11px] font-semibold text-white">
                  {profile?.initials || 'VC'}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-[9rem] truncate text-xs font-medium text-ink">
                    {profile?.displayName || 'Guest'}
                  </span>
                  <span className="block max-w-[9rem] truncate text-[10px] text-ink-faint">
                    {profile?.roleTitle || 'Set a target role'}
                  </span>
                </span>
              </button>
            </div>
          </div>

          {interviewTimestampLabel ? (
            <div className="flex items-center gap-2 border-t border-stroke-soft px-4 py-2 sm:hidden">
              <CalendarClock className="size-3.5 text-brand-violet-soft" strokeWidth={1.9} />
              <p className="truncate text-[11px] text-ink-subtle">
                Interview · {interviewTimestampLabel}
              </p>
            </div>
          ) : null}
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

export { NAV }
