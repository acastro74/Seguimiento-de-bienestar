import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, endOfMonth, getISODay, startOfMonth } from 'date-fns'
import { useDays } from '@/data/hooks'
import { cx } from '@/components/ui'
import { fmt, fromISO, shiftISO, toISO } from '@/lib/dates'
import { useToday } from '@/lib/useToday'
import { dayMetrics, fmtNum, isLogged } from '@/lib/stats'
import { AREA } from '@/components/ui'

export function History() {
  const today = useToday()
  const [month, setMonth] = useState(() => toISO(startOfMonth(new Date())))
  const first = month
  const last = toISO(endOfMonth(fromISO(month)))
  const days = useDays(first, last).data ?? []
  const byDate = new Map(days.filter(isLogged).map((d) => [d.date, d]))
  const lead = getISODay(fromISO(first)) - 1
  const cells: (string | null)[] = [...Array(lead).fill(null)]
  for (let d = first; d <= last; d = shiftISO(d, 1)) cells.push(d)
  const isCurrent = month === toISO(startOfMonth(fromISO(today)))

  const logged = [...byDate.values()].map(dayMetrics)
  const avg = (k: 'mood' | 'sleepH') => {
    const v = logged.map((m) => m[k]).filter((x): x is number => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-2">
        <button className="btn-ghost h-9 w-9 p-0" onClick={() => setMonth(toISO(addMonths(fromISO(month), -1)))} aria-label="Mes anterior">
          ‹
        </button>
        <h1 className="flex-1 text-center text-xl font-black first-letter:uppercase">{fmt(month, "MMMM yyyy")}</h1>
        <button className="btn-ghost h-9 w-9 p-0" disabled={isCurrent} onClick={() => setMonth(toISO(addMonths(fromISO(month), 1)))} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Días registrados" value={String(byDate.size)} />
        <Stat label="Ánimo promedio" value={fmtNum(avg('mood'))} />
        <Stat label="Sueño promedio" value={`${fmtNum(avg('sleepH'))} h`} />
      </div>

      <div className="rounded-3xl border border-line bg-surface p-3">
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-muted">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />
            const e = byDate.get(d)
            const m = e ? dayMetrics(e) : null
            const future = d > today
            const mood = m?.mood
            return (
              <Link
                key={d}
                to={future ? '#' : `/?fecha=${d}`}
                aria-disabled={future}
                className={cx(
                  'flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition',
                  future ? 'pointer-events-none border-transparent opacity-30' : 'border-line hover:ring-2 hover:ring-sleep/40',
                  d === today && 'ring-2 ring-coral',
                )}
                style={mood != null ? { background: `color-mix(in oklab, ${AREA.mood.hex} ${Math.round(12 + mood * 7)}%, var(--surface))` } : undefined}
                title={m ? `Ánimo ${mood ?? '–'} · Sueño ${fmtNum(m.sleepH)} h` : 'Sin registro'}
              >
                <span className="font-black">{fmt(d, 'd')}</span>
                {e && <span className="text-[10px] leading-none">{mood != null ? FACES[Math.min(4, Math.floor((mood - 1) / 2))] : '•'}</span>}
              </Link>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Toca un día para ver o editar su registro.</p>
    </div>
  )
}

const FACES = ['😣', '😕', '😐', '🙂', '😄']

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-2">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] font-bold text-muted">{label}</div>
    </div>
  )
}
