import { useNavigate } from 'react-router-dom'
import { getISODay } from 'date-fns'
import type { DayEntry, ISODate } from '@/data/types'
import { fmt, fromISO, shiftISO } from '@/lib/dates'

/** Grilla tipo calendario (columnas = semanas, filas = lun–dom). Un solo tono, más oscuro = mejor ánimo. */
export function MoodHeatmap({ entries, to, days, color }: { entries: DayEntry[]; to: ISODate; days: number; color: string }) {
  const nav = useNavigate()
  const byDate = new Map(entries.map((e) => [e.date, e.mood]))
  // Empezar en lunes
  let start = shiftISO(to, -(days - 1))
  start = shiftISO(start, -(getISODay(fromISO(start)) - 1))
  const cells: { date: ISODate; mood: number | null | undefined }[] = []
  for (let d = start; d <= to; d = shiftISO(d, 1)) cells.push({ date: d, mood: byDate.get(d) })
  const weeks = Math.ceil(cells.length / 7)
  const bg = (m: number | null | undefined) =>
    m == null ? 'var(--surface-2)' : `color-mix(in oklab, ${color} ${Math.round(15 + (m / 10) * 85)}%, var(--surface))`

  return (
    <div>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-1 pt-0 text-[10px] font-bold text-muted">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="grid h-full place-items-center">
              {d}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {cells.map((c) => (
            <button
              key={c.date}
              type="button"
              onClick={() => nav(`/?fecha=${c.date}`)}
              className="aspect-square max-h-9 rounded-[5px] transition hover:ring-2 hover:ring-ink/30"
              style={{ background: bg(c.mood) }}
              title={`${fmt(c.date, "EEE d 'de' MMM")}: ${c.mood != null ? `ánimo ${c.mood}/10` : 'sin registro'}`}
              aria-label={`${fmt(c.date, "d 'de' MMMM")}: ${c.mood != null ? `ánimo ${c.mood}` : 'sin registro'}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        <span>Bajo</span>
        {[2, 4, 6, 8, 10].map((m) => (
          <span key={m} className="h-3 w-3 rounded-[3px]" style={{ background: bg(m) }} />
        ))}
        <span>Alto</span>
        <span className="ml-2 h-3 w-3 rounded-[3px]" style={{ background: 'var(--surface-2)' }} />
        <span>Sin registro</span>
      </div>
    </div>
  )
}
