import { NavLink, Outlet } from 'react-router-dom'
import { useRepoCtx } from '@/data/RepoProvider'
import { cx } from './ui'

const NAV = [
  { to: '/', label: 'Hoy', icon: '📝', end: true },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/historial', label: 'Historial', icon: '🗓️' },
  { to: '/reportes', label: 'Reportes', icon: '🖨️' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

export function Shell() {
  const { repo } = useRepoCtx()
  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Logo />
          <nav className="ml-auto hidden gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx('rounded-full px-3 py-1.5 text-sm font-bold transition', isActive ? 'bg-sleep text-white' : 'text-muted hover:bg-surface-2')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          {repo?.mode === 'demo' && (
            <span className="ml-auto rounded-full bg-meds/15 px-2.5 py-1 text-[11px] font-extrabold text-meds md:ml-2">MODO DEMO</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        <Outlet />
      </main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition', isActive ? 'text-sleep' : 'text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-7 w-12 place-items-center rounded-full text-lg transition', isActive && 'bg-sleep/15')}>{n.icon}</span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/icon.svg" alt="" className="h-8 w-8" />
      <span className="text-[17px] leading-none font-black tracking-tight">
        <span className="text-coral">Bitácora</span> <span className="text-sleep">de</span>{' '}
        <span className="text-move">Bienestar</span>
      </span>
    </div>
  )
}
