import { useState } from 'react'
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import type { DayEntry, Habit, ISODate, Medication } from '@/data/types'
import { EXERCISE_TYPES, FOOD_GROUPS, MEAL_TYPES, RESTED, SLEEP_QUALITY } from '@/data/defaults'
import { useDays, useHabits, useMedications, useProfileOrDefault } from '@/data/hooks'
import { useRepo } from '@/data/RepoProvider'
import { Segmented, Spinner } from '@/components/ui'
import { dateRange, fmt, fromISO, shiftISO, toISO, todayISO } from '@/lib/dates'
import { sleepMetrics } from '@/lib/sleep'
import { fmtNum, summarize } from '@/lib/stats'
import { downloadFile, toCSV } from '@/lib/csv'

type Kind = 'semana' | 'mes'

export function Reports() {
  const [kind, setKind] = useState<Kind>('semana')
  const [anchor, setAnchor] = useState(todayISO())
  const repo = useRepo()
  const from = toISO(kind === 'semana' ? startOfWeek(fromISO(anchor), { weekStartsOn: 1 }) : startOfMonth(fromISO(anchor)))
  const to = toISO(kind === 'semana' ? endOfWeek(fromISO(anchor), { weekStartsOn: 1 }) : endOfMonth(fromISO(anchor)))
  // Un día extra antes del período: el diario del sueño usa la cafeína/alcohol del día previo
  const q = useDays(shiftISO(from, -1), to)
  const inPeriod = (q.data ?? []).filter((d) => d.date >= from)
  const profile = useProfileOrDefault()
  const habits = useHabits().data ?? []
  const meds = useMedications().data ?? []
  const [busy, setBusy] = useState(false)

  const move = (n: number) => setAnchor(kind === 'semana' ? shiftISO(anchor, n * 7) : toISO(addMonths(fromISO(anchor), n)))
  const title = kind === 'semana' ? `Semana del ${fmt(from, "d 'de' MMM")} al ${fmt(to, "d 'de' MMM yyyy")}` : fmt(from, 'MMMM yyyy')

  const csvRange = () => downloadFile(`bitacora_${from}_${to}.csv`, toCSV(inPeriod, habits, meds))
  const csvAll = async () => {
    setBusy(true)
    try {
      const all = await repo.listDays('2000-01-01', todayISO())
      downloadFile(`bitacora_completa_${todayISO()}.csv`, toCSV(all, habits, meds))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="no-print mb-4 space-y-3">
        <h1 className="text-2xl font-black">Reportes</h1>
        <p className="text-sm text-muted">
          Genera una hoja para llevar a tu consulta (imprimir o guardar como PDF) o descarga tus datos en Excel/CSV.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <Segmented<Kind> value={kind} onChange={(v) => v && setKind(v)} options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }]} />
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-ghost h-9 w-9 p-0" onClick={() => move(-1)} aria-label="Anterior">
              ‹
            </button>
            <span className="min-w-52 text-center text-sm font-bold first-letter:uppercase">{title}</span>
            <button className="btn-ghost h-9 w-9 p-0" onClick={() => move(1)} disabled={to >= todayISO()} aria-label="Siguiente">
              ›
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ Imprimir / Guardar PDF
          </button>
          <button className="btn-ghost" onClick={csvRange}>
            ⬇️ CSV de este período
          </button>
          <button className="btn-ghost" onClick={csvAll} disabled={busy}>
            ⬇️ CSV de todo el historial
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6 overflow-x-auto rounded-3xl border border-line bg-white p-4 text-black print:overflow-visible print:rounded-none print:border-0 print:p-0">
          <ReportSummary days={q.data ?? []} from={from} to={to} name={profile.name} title={title} goals={profile.goals} />
          <WellnessSheet days={q.data ?? []} from={from} to={to} habits={habits} />
          <SleepDiary days={q.data ?? []} from={from} to={to} meds={meds} />
        </div>
      )}
    </div>
  )
}

function Header({ title, name, sub }: { title: string; name: string; sub: string }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-black tracking-wide">{title}</h2>
      <div className="text-right text-xs">
        <div>
          <b>Nombre:</b> {name || '—'}
        </div>
        <div className="first-letter:uppercase">{sub}</div>
      </div>
    </div>
  )
}

function ReportSummary({ days, from, to, name, title, goals }: { days: DayEntry[]; from: ISODate; to: ISODate; name: string; title: string; goals: ReturnType<typeof useProfileOrDefault>['goals'] }) {
  const s = summarize(days, goals, from, to, to)
  const items = [
    ['Días registrados', `${s.daysLogged}/${s.daysInRange}`],
    ['Sueño promedio', `${fmtNum(s.sleepH)} h`],
    ['Eficiencia del sueño', `${fmtNum(s.efficiency, 0)} %`],
    ['Ánimo', `${fmtNum(s.mood)}/10`],
    ['Energía', `${fmtNum(s.energy)}/10`],
    ['Estrés', `${fmtNum(s.stress)}/10`],
    ['Días con meta de agua', `${fmtNum(s.waterGoalPct, 0)} %`],
    ['Ejercicio total', `${days.filter((d) => d.date >= from && d.date <= to).reduce((a, d) => a + d.exercise.reduce((b, x) => b + x.minutes, 0), 0)} min`],
  ]
  return (
    <section className="break-inside-avoid">
      <Header title="Resumen" name={name} sub={title} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-gray-300 p-2">
            <div className="text-[11px] text-gray-600">{k}</div>
            <div className="text-lg font-black">{v}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

const short = (g: string) => FOOD_GROUPS.find((f) => f.value === g)?.short ?? g

/** Réplica digital de la hoja "Seguimiento de Bienestar". */
function WellnessSheet({ days, from, to, habits }: { days: DayEntry[]; from: ISODate; to: ISODate; habits: Habit[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const hName = new Map(habits.map((h) => [h.id, `${h.emoji} ${h.name}`]))
  const head = 'border border-[#e9a29b] px-1.5 py-1 text-[10px] font-black uppercase text-white'
  const cell = 'border border-[#e9a29b] px-1.5 py-1 align-top text-[11px]'
  return (
    <section>
      <h2 className="mb-2 text-2xl font-black tracking-wide">
        {'SEGUIMIENTO DE BIENESTAR'.split('').map((ch, i) => (
          <span key={i} style={{ color: ['#e5675b', '#7d70d0', '#4f9d78', '#ec8650', '#df6f9c', '#4aa8dc'][i % 6] }}>
            {ch}
          </span>
        ))}
      </h2>
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr>
            <th className={head} style={{ background: '#e5675b' }} rowSpan={2}>Fecha</th>
            <th className={head} style={{ background: '#7d70d0' }} rowSpan={2}>Horas de sueño</th>
            <th className={head} style={{ background: '#4f9d78' }} rowSpan={2}>Ejercicio</th>
            <th className={head} style={{ background: '#ec8650' }} rowSpan={2}>Cuidados personales</th>
            <th className={head} style={{ background: '#df6f9c' }} colSpan={4}>Nutrición</th>
            <th className={head} style={{ background: '#b47fd8' }} rowSpan={2}>Ánimo / Energía / Estrés</th>
            <th className={head} style={{ background: '#4aa8dc' }} rowSpan={2}>Agua</th>
          </tr>
          <tr>
            {MEAL_TYPES.map((m) => (
              <th key={m.value} className={head} style={{ background: '#e98db3' }}>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dateRange(from, to).map((d) => {
            const e = byDate.get(d)
            const sm = e ? sleepMetrics(e.sleep) : null
            return (
              <tr key={d} className="break-inside-avoid">
                <td className={cell + ' font-bold whitespace-nowrap'}>{fmt(d, 'EEE d MMM')}</td>
                <td className={cell}>{sm?.asleepH != null ? `${fmtNum(sm.asleepH)} h` : ''}</td>
                <td className={cell}>
                  {e?.exercise.map((x) => (
                    <div key={x.id}>
                      {EXERCISE_TYPES.find((t) => t.value === x.type)?.label[0]}={x.minutes} min
                    </div>
                  ))}
                </td>
                <td className={cell}>{e?.habitIds.map((id) => hName.get(id)).filter(Boolean).join(', ')}</td>
                {MEAL_TYPES.map((t) => {
                  const m = e?.meals.find((x) => x.type === t.value)
                  return (
                    <td key={t.value} className={cell}>
                      {m && (
                        <>
                          {m.groups.length > 0 && <b>{m.groups.map(short).join(' ')} </b>}
                          <span>{m.description}</span>
                        </>
                      )}
                    </td>
                  )
                })}
                <td className={cell + ' whitespace-nowrap'}>
                  {e && (e.mood != null || e.energy != null) ? `${e.mood ?? '–'} / ${e.energy ?? '–'} / ${e.stress ?? '–'}` : ''}
                </td>
                <td className={cell}>
                  {e && e.water > 0 && (
                    <span className="whitespace-nowrap">
                      {'💧'.repeat(Math.min(e.water, 8))}
                      {e.water > 8 ? `+${e.water - 8}` : ''}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-gray-600">F = Fuerza · C = Cardio · M = Movilidad · P = Proteína · C = Carbohidrato · V = Vegetales · F = Fruta · L = Lácteos</p>
    </section>
  )
}

/** Réplica digital del "Diario del Sueño" (Consensus Sleep Diary): preguntas en filas, días en columnas. */
function SleepDiary({ days, from, to, meds }: { days: DayEntry[]; from: ISODate; to: ISODate; meds: Medication[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const dates = dateRange(from, to)
  const chunks: ISODate[][] = []
  for (let i = 0; i < dates.length; i += 7) chunks.push(dates.slice(i, i + 7))
  const sleepAids = new Set(meds.filter((m) => m.sleepAid).map((m) => m.id))
  const medName = new Map(meds.map((m) => [m.id, m.name]))

  // El diario pregunta por la noche anterior; cafeína/alcohol/siesta son del día previo
  const rows: [string, (e: DayEntry | undefined, prev: DayEntry | undefined) => string][] = [
    ['1. ¿A qué hora se metió a la cama?', (e) => e?.sleep.bedTime ?? ''],
    ['2. ¿A qué hora apagó la luz?', (e) => e?.sleep.lightsOff ?? ''],
    ['3. ¿Cuánto tiempo le tomó dormirse?', (e) => (e?.sleep.latencyMin != null ? `${e.sleep.latencyMin} min` : '')],
    ['4. ¿Cuántas veces se despertó?', (e) => (e?.sleep.awakenings != null ? String(e.sleep.awakenings) : '')],
    ['5. Tiempo total despiert@ en la noche', (e) => (e?.sleep.awakeMin != null ? `${e.sleep.awakeMin} min` : '')],
    ['6a. Hora final de despertarse', (e) => e?.sleep.finalWake ?? ''],
    ['6b. ¿Se despertó antes de lo planeado?', (e) => (e?.sleep.wokeEarlyMin == null ? '' : e.sleep.wokeEarlyMin > 0 ? `Sí, ${e.sleep.wokeEarlyMin} min` : 'No')],
    ['7. ¿A qué hora se salió de la cama?', (e) => e?.sleep.outOfBed ?? ''],
    ['8. ¿Cuántas horas durmió?', (e) => (e ? (sleepMetrics(e.sleep).asleepH != null ? `${fmtNum(sleepMetrics(e.sleep).asleepH)} h` : '') : '')],
    ['9. Calidad del sueño', (e) => (e?.sleep.quality ? SLEEP_QUALITY[e.sleep.quality - 1] : '')],
    ['10. ¿Qué tan descansad@ se sintió?', (e) => (e?.sleep.rested ? RESTED[e.sleep.rested - 1] : '')],
    [
      '11. ¿Tomó algo para dormir? (hora)',
      (_e, prev) =>
        prev?.intakes
          .filter((i) => i.kind === 'medicamento' && i.medicationId && sleepAids.has(i.medicationId))
          .map((i) => `${medName.get(i.medicationId!) ?? ''} ${i.time ?? ''}`)
          .join(', ') ?? '',
    ],
    ['12a. Siesta', (e) => (e?.sleep.napMin ? `${e.sleep.napMin} min` : e ? 'No' : '')],
    [
      '12b. Alcohol (# y hora)',
      (_e, prev) => {
        const a = prev?.intakes.filter((i) => i.kind === 'alcohol') ?? []
        return prev ? (a.length ? a.map((i) => `${i.amount} @${i.time ?? '?'}`).join(', ') : 'No') : ''
      },
    ],
    [
      '12c. Cafeína (# y hora)',
      (_e, prev) => {
        const a = prev?.intakes.filter((i) => i.kind === 'cafeina') ?? []
        return prev ? (a.length ? a.map((i) => `${i.amount} @${i.time ?? '?'}`).join(', ') : 'No') : ''
      },
    ],
    [
      '13. Eficiencia (dormido / en cama)',
      (e) => {
        if (!e) return ''
        const m = sleepMetrics(e.sleep)
        return m.efficiency != null ? `${fmtNum(m.asleepH)}/${fmtNum(m.timeInBedH)} = ${m.efficiency} %` : ''
      },
    ],
    ['Comentarios', (e) => e?.sleep.comment ?? ''],
  ]

  return (
    <>
      {chunks.map((chunk, ci) => (
        <section key={ci} style={{ breakBefore: 'page' }} className="break-inside-avoid">
          <h2 className="mb-2 text-center text-xl font-black">DIARIO DEL SUEÑO</h2>
          <table className="w-full min-w-[800px] border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="w-64 border-2 border-black px-2 py-1 text-right">Fecha (mañana)</th>
                {chunk.map((d) => (
                  <th key={d} className="border-2 border-black bg-[#fff59d] px-1 py-1 whitespace-nowrap">
                    {fmt(d, 'EEE d MMM')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([q, f]) => (
                <tr key={q}>
                  <td className="border border-black px-2 py-1">{q}</td>
                  {chunk.map((d) => (
                    <td key={d} className="border border-black px-1 py-1 text-center">
                      {f(byDate.get(d), byDate.get(shiftISO(d, -1)))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-right text-[10px] text-gray-600">Adaptado del Consensus Sleep Diary, Carney et al., 2012</p>
        </section>
      ))}
    </>
  )
}
