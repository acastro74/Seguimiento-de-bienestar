import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ISODate } from '@/data/types'
import { useDayEditor, useDays, useHabits, useMedications, usePreviousDay, useProfileOrDefault, type SaveStatus } from '@/data/hooks'
import { Ring, Spinner, cx, AREA } from '@/components/ui'
import { fmt, shiftISO } from '@/lib/dates'
import { useToday } from '@/lib/useToday'
import { isLogged, sections } from '@/lib/stats'
import { BodyCard, CareCard, CycleCard, ExerciseCard, IntakeCard, MealsCard, MedsCard, MoodCard, NoteCard, SleepCard, WaterCard } from './cards'

export function Today() {
  const [params, setParams] = useSearchParams()
  // Se actualiza solo (medianoche, al volver a la pestaña): la app no se queda "pegada" en un día
  const today = useToday()
  const raw = params.get('fecha')
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today
  const setDate = (d: ISODate) => setParams(d === today ? {} : { fecha: d }, { replace: true })

  return (
    <div className="mx-auto max-w-xl">
      <DateStrip date={date} today={today} onChange={setDate} />
      {date !== today && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-care/40 bg-care/10 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">
            Estás editando el <b>{fmt(date, "EEEE d 'de' MMMM")}</b>
          </span>
          <button className="btn-primary shrink-0 bg-care px-3 py-1 text-xs" onClick={() => setDate(today)}>
            Ir a hoy
          </button>
        </div>
      )}
      <DayForm key={date} date={date} isToday={date === today} />
    </div>
  )
}

function DayForm({ date, isToday }: { date: ISODate; isToday: boolean }) {
  const profile = useProfileOrDefault()
  const habits = useHabits().data ?? []
  const meds = useMedications().data ?? []
  const prev = usePreviousDay(date).data ?? null
  const { entry, update, status, retry, loading, error } = useDayEditor(date)

  if (error) return <p className="py-10 text-center font-bold text-coral">No se pudo cargar el día: {(error as Error).message}</p>
  if (loading || !entry) return <Spinner />

  const secs = sections(entry, profile)
  const done = (k: string) => !!secs.find((s) => s.key === k)?.done
  const doneCount = secs.filter((s) => s.done).length
  const p = { entry, update }
  const greeting = profile.name ? `${greet()}, ${profile.name.split(' ')[0]}` : greet()

  return (
    <>
      <div className="my-4 flex items-center gap-4">
        <Ring value={doneCount} max={secs.length} size={64} color={doneCount === secs.length ? AREA.move.hex : AREA.sleep.hex}>
          <span className="text-sm font-black">
            {doneCount}/{secs.length}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted">{isToday ? greeting : 'Editando registro'}</p>
          <h1 className="text-xl leading-tight font-black first-letter:uppercase">{fmt(date, "EEEE d 'de' MMMM")}</h1>
          <SaveBadge status={status} onRetry={retry} />
        </div>
      </div>

      <div className="space-y-3">
        <SleepCard {...p} prev={prev} goals={profile.goals} done={done('sueno')} />
        <MoodCard {...p} done={done('animo')} />
        <WaterCard {...p} goals={profile.goals} done={done('agua')} />
        <MealsCard {...p} done={done('comidas')} />
        <ExerciseCard {...p} done={done('ejercicio')} />
        <CareCard {...p} habits={habits} done={done('cuidados')} />
        <IntakeCard {...p} done={done('consumos')} />
        <MedsCard {...p} meds={meds} />
        {profile.trackWeight && <BodyCard {...p} done={done('peso')} />}
        {profile.trackCycle && <CycleCard {...p} done={done('ciclo')} />}
        <NoteCard {...p} />
      </div>
      <p className="mt-6 mb-2 text-center text-xs text-muted">Todo se guarda automáticamente ✨</p>
    </>
  )
}

function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function SaveBadge({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'error')
    return (
      <button onClick={onRetry} className="text-xs font-bold text-coral">
        ⚠️ No se pudo guardar — reintentar
      </button>
    )
  return (
    <span className={cx('text-xs font-bold', status === 'saving' ? 'text-muted' : 'text-move')} aria-live="polite">
      {status === 'saving' ? 'Guardando…' : '✓ Guardado'}
    </span>
  )
}

function DateStrip({ date, today, onChange }: { date: ISODate; today: ISODate; onChange: (d: ISODate) => void }) {
  // 7 días terminando en la fecha elegida (o en hoy si se está cerca)
  const end = shiftISO(date, 3) > today ? today : shiftISO(date, 3)
  const days = Array.from({ length: 7 }, (_, i) => shiftISO(end, i - 6))
  const logged = useDays(days[0], days[6]).data ?? []
  const loggedSet = new Set(logged.filter(isLogged).map((d) => d.date))

  return (
    <div className="flex items-center gap-1">
      <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2" onClick={() => onChange(shiftISO(date, -1))} aria-label="Día anterior">
        ‹
      </button>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const sel = d === date
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              className={cx('flex flex-col items-center rounded-2xl py-1.5 transition', sel ? 'bg-sleep text-white shadow-sm' : 'hover:bg-surface-2')}
              aria-current={sel ? 'date' : undefined}
              aria-label={fmt(d, "EEEE d 'de' MMMM")}
            >
              <span className={cx('text-[10px] font-bold uppercase', sel ? 'text-white/80' : 'text-muted')}>{fmt(d, 'EEEEEE')}</span>
              <span className="text-base font-black">{fmt(d, 'd')}</span>
              <span className={cx('h-1.5 w-1.5 rounded-full', loggedSet.has(d) ? (sel ? 'bg-white' : 'bg-move') : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
      <button
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30"
        onClick={() => onChange(shiftISO(date, 1))}
        disabled={date >= today}
        aria-label="Día siguiente"
      >
        ›
      </button>
      <DatePicker date={date} today={today} onChange={onChange} />
    </div>
  )
}

/** Botón de calendario para saltar a cualquier día pasado. */
function DatePicker({ date, today, onChange }: { date: ISODate; today: ISODate; onChange: (d: ISODate) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    const el = ref.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }
  return (
    <div className="relative shrink-0">
      <button className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-surface-2" onClick={open} aria-label="Elegir fecha">
        📅
      </button>
      <input
        ref={ref}
        type="date"
        aria-label="Fecha del registro"
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 opacity-0"
        value={date}
        max={today}
        onChange={(e) => {
          const v = e.target.value
          if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today) onChange(v)
        }}
      />
    </div>
  )
}
