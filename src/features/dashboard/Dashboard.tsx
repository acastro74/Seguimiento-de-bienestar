import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayEntry, Habit, ISODate } from '@/data/types'
import { EXERCISE_TYPES } from '@/data/defaults'
import { useDays, useHabits, useProfileOrDefault } from '@/data/hooks'
import { Ring, Segmented, Spinner, Empty, cx } from '@/components/ui'
import { dateRange, fmt, shiftISO } from '@/lib/dates'
import { useToday } from '@/lib/useToday'
import { dayMetrics, fmtNum, isLogged, plateBalance, summarize, weeklyExercise, type DayMetrics } from '@/lib/stats'
import { computeInsights } from '@/lib/insights'
import { ChartCard, KpiTile, Legend, Tip, useChartColors } from './chartKit'
import { MoodHeatmap } from './MoodHeatmap'

const PERIODS = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
]

export function Dashboard() {
  const [period, setPeriod] = useState(30)
  const today = useToday()
  const loadFrom = shiftISO(today, -179)
  const q = useDays(loadFrom, today)
  const profile = useProfileOrDefault()
  const habits = useHabits().data ?? []

  if (q.isLoading) return <Spinner />
  const all = (q.data ?? []).filter(isLogged)
  const from = shiftISO(today, -(period - 1))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-black">Tu bienestar</h1>
        <div className="w-64">
          <Segmented value={period} onChange={(v) => v && setPeriod(v)} options={PERIODS} />
        </div>
      </div>
      {all.length === 0 ? (
        <Empty>
          Aún no hay registros. <Link to="/" className="font-bold text-sleep">Haz tu primer check-in</Link> y vuelve aquí para ver tus tendencias.
        </Empty>
      ) : (
        <DashboardBody all={all} from={from} to={today} period={period} habits={habits} goals={profile.goals} />
      )}
    </div>
  )
}

function DashboardBody({
  all,
  from,
  to,
  period,
  habits,
  goals,
}: {
  all: DayEntry[]
  from: ISODate
  to: ISODate
  period: number
  habits: Habit[]
  goals: ReturnType<typeof useProfileOrDefault>['goals']
}) {
  const c = useChartColors()
  const profile = useProfileOrDefault()
  const inRange = all.filter((e) => e.date >= from && e.date <= to)
  const prevFrom = shiftISO(from, -period)
  const prevTo = shiftISO(from, -1)
  const s = summarize(all, goals, from, to, to)
  const prev = summarize(all, goals, prevFrom, prevTo, to)
  const hasPrev = prev.daysLogged >= Math.min(3, period / 3)
  const delta = (a: number | null, b: number | null) => (hasPrev && a != null && b != null ? a - b : null)

  // Serie diaria con huecos para días sin registro
  const series = useMemo(() => {
    const byDate = new Map(all.map((e) => [e.date, dayMetrics(e)]))
    const rolling = (d: ISODate, k: 'mood' | 'energy' | 'stress') => {
      const v = dateRange(shiftISO(d, -6), d)
        .map((x) => byDate.get(x)?.[k])
        .filter((x): x is number => x != null)
      return v.length >= 3 ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
    }
    return dateRange(from, to).map((d) => {
      const m = byDate.get(d)
      return {
        date: d,
        ...(m ?? ({} as Partial<DayMetrics>)),
        moodAvg: rolling(d, 'mood'),
        energyAvg: rolling(d, 'energy'),
        stressAvg: rolling(d, 'stress'),
      }
    })
  }, [all, from, to])
  const smooth = period > 7
  const [showAllInsights, setShowAllInsights] = useState(false)

  const insights = useMemo(() => computeInsights(all.filter((e) => e.date >= shiftISO(to, -89)), goals, habits), [all, goals, habits, to])
  const plate = plateBalance(inRange)
  const weeks = weeklyExercise(inRange, from, to)
  const habitStats = habits
    .filter((h) => h.active)
    .map((h) => ({ name: `${h.emoji} ${h.name}`, pct: s.daysLogged ? Math.round((inRange.filter((e) => e.habitIds.includes(h.id)).length / s.daysLogged) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
  const weights = series.filter((x) => x.weightKg != null)

  const tickFmt = (d: string) => (period <= 7 ? fmt(d, 'EEE') : fmt(d, 'd MMM'))
  const labelFmt = (d: string) => fmt(d, "EEEE d 'de' MMMM")
  const xAxis = (
    <XAxis
      dataKey="date"
      tickFormatter={tickFmt}
      tick={{ fontSize: 11, fill: c.axis }}
      axisLine={{ stroke: c.grid }}
      tickLine={false}
      minTickGap={18}
    />
  )
  const grid = <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="0" />
  const exercisePct = Math.min(100, (s.exerciseMinPerWeek / goals.exerciseMinWeek) * 100)

  return (
    <>
      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile emoji="😊" label="Ánimo promedio" value={fmtNum(s.mood)} unit="/10" delta={delta(s.mood, prev.mood)} />
        <KpiTile emoji="⚡" label="Energía promedio" value={fmtNum(s.energy)} unit="/10" delta={delta(s.energy, prev.energy)} />
        <KpiTile emoji="😮‍💨" label="Estrés promedio" value={fmtNum(s.stress)} unit="/10" delta={delta(s.stress, prev.stress)} goodWhenUp={false} />
        <KpiTile emoji="🔥" label="Racha de registro" value={String(s.streak)} unit={s.streak === 1 ? 'día' : 'días'} hint={`${s.daysLogged} de ${s.daysInRange} días registrados`} />
        <KpiTile emoji="🌙" label="Sueño promedio" value={fmtNum(s.sleepH)} unit="h" delta={delta(s.sleepH, prev.sleepH)} hint={`Meta ${fmtNum(goals.sleepHours)} h`} />
        <KpiTile emoji="🛏️" label="Eficiencia del sueño" value={fmtNum(s.efficiency, 0)} unit="%" delta={delta(s.efficiency, prev.efficiency)} hint={`Meta ≥ ${goals.sleepEfficiency} %`} />
        <KpiTile emoji="💧" label="Días con meta de agua" value={fmtNum(s.waterGoalPct, 0)} unit="%" hint={`Meta ${goals.waterGlasses} vasos/día`}>
          <Ring value={s.waterGoalPct ?? 0} max={100} size={40} stroke={5} color={c.water} />
        </KpiTile>
        <KpiTile emoji="🏃" label="Ejercicio por semana" value={fmtNum(s.exerciseMinPerWeek, 0)} unit="min" hint={`Meta ${goals.exerciseMinWeek} min`}>
          <Ring value={exercisePct} max={100} size={40} stroke={5} color={c.exercise[2]} />
        </KpiTile>
      </div>

      {/* Hallazgos */}
      <ChartCard title="💡 Hallazgos" subtitle="Comparación de tus días según tus hábitos (últimos 90 días). Son correlaciones, no necesariamente causas.">
        {insights.length === 0 ? (
          <Empty>Sigue registrando: con unas 2–3 semanas de datos empezarán a aparecer patrones aquí.</Empty>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {(showAllInsights ? insights : insights.slice(0, 4)).map((i) => (
              <li key={i.id} className={cx('flex gap-3 rounded-2xl border p-3 text-sm', i.positive ? 'border-move/30 bg-move/8' : 'border-care/30 bg-care/8')}>
                <span className="text-xl">{i.emoji}</span>
                <div>
                  <p className="font-semibold">{i.text}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {i.positive ? '✅ Asociado a sentirte mejor' : '⚠️ Asociado a sentirte peor'} · {i.nWith} vs {i.nWithout} días
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {insights.length > 4 && (
          <button className="mt-3 text-sm font-bold text-sleep" onClick={() => setShowAllInsights((x) => !x)}>
            {showAllInsights ? 'Ver menos' : `Ver los ${insights.length} hallazgos`}
          </button>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ánimo */}
        <ChartCard title="Ánimo, energía y estrés" subtitle={smooth ? 'Promedio móvil de 7 días (escala 1–10)' : 'Escala 1–10 por día'}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              {grid}
              {xAxis}
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip fmtLabel={labelFmt} />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
              <Line type="monotone" dataKey={smooth ? 'moodAvg' : 'mood'} name="Ánimo" stroke={c.mood} strokeWidth={2} dot={smooth ? false : { r: 3 }} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} connectNulls />
              <Line type="monotone" dataKey={smooth ? 'energyAvg' : 'energy'} name="Energía" stroke={c.energy} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} connectNulls />
              <Line type="monotone" dataKey={smooth ? 'stressAvg' : 'stress'} name="Estrés" stroke={c.stress} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <Legend
            items={[
              { label: 'Ánimo', color: c.mood },
              { label: 'Energía', color: c.energy },
              { label: 'Estrés (línea punteada)', color: c.stress, dashed: true },
            ]}
          />
        </ChartCard>

        {/* Sueño: dos gráficos con el mismo eje de tiempo (no doble eje) */}
        <ChartCard title="Sueño" subtitle="Horas dormidas por noche y eficiencia (dormido / en cama)">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId="sleep">
              {grid}
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 'dataMax + 1']} allowDecimals={false} tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} width={44} unit=" h" />
              <Tooltip content={<Tip fmtLabel={labelFmt} fmtValue={(v) => `${fmtNum(v)} h`} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
              <ReferenceLine y={goals.sleepHours} stroke={c.goal} strokeDasharray="4 4" strokeOpacity={0.6} />
              <Bar dataKey="sleepH" name="Horas dormidas" fill={c.single} radius={[4, 4, 0, 0]} stroke={c.surface} strokeWidth={period > 30 ? 0 : 2} />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId="sleep">
              {grid}
              {xAxis}
              <YAxis domain={[(min: number) => Math.max(0, Math.floor((min - 5) / 10) * 10), 100]} tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} width={44} tickCount={3} unit="%" />
              <Tooltip content={<Tip fmtLabel={labelFmt} fmtValue={(v) => `${v} %`} />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
              <ReferenceLine y={goals.sleepEfficiency} stroke={c.goal} strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line type="monotone" dataKey="efficiency" name="Eficiencia" stroke={c.stress} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <Legend
            items={[
              { label: 'Horas dormidas', color: c.single },
              { label: 'Eficiencia', color: c.stress },
              { label: 'Metas', color: c.goal, dashed: true },
            ]}
          />
        </ChartCard>

        {/* Calendario de ánimo */}
        <ChartCard title="Calendario de ánimo" subtitle="Color más intenso = mejor ánimo. Toca un día para editarlo.">
          <MoodHeatmap entries={all} to={to} days={Math.max(period, 35)} color={c.mood} />
        </ChartCard>

        {/* Ejercicio */}
        <ChartCard title="Ejercicio por semana" subtitle={`Minutos por tipo · meta ${goals.exerciseMinWeek} min/semana`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeks.map((w) => ({ ...w, total: EXERCISE_TYPES.reduce((a, t) => a + w[t.value], 0) }))} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="week" tickFormatter={(d) => fmt(d, 'd MMM')} tick={{ fontSize: 11, fill: c.axis }} axisLine={{ stroke: c.grid }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip fmtLabel={(d) => `Semana del ${fmt(d, "d 'de' MMMM")}`} fmtValue={(v) => `${v} min`} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
              <ReferenceLine y={goals.exerciseMinWeek} stroke={c.goal} strokeDasharray="4 4" strokeOpacity={0.6} />
              {EXERCISE_TYPES.map((t, i) => (
                <Bar
                  key={t.value}
                  dataKey={t.value}
                  name={t.label}
                  stackId="ex"
                  fill={c.exercise[i]}
                  stroke={c.surface}
                  strokeWidth={2}
                  radius={i === EXERCISE_TYPES.length - 1 ? [4, 4, 0, 0] : 0}
                >
                  {i === EXERCISE_TYPES.length - 1 && <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: c.axis, fontWeight: 700 }} formatter={(v) => (Number(v) ? v : '') as string} />}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <Legend items={EXERCISE_TYPES.map((t, i) => ({ label: t.label, color: c.exercise[i] }))} />
        </ChartCard>

        {/* Plato */}
        <ChartCard title="Balance del plato" subtitle="% de comidas registradas que incluyeron cada grupo">
          <HBar rows={plate.map((p) => ({ name: p.label, pct: p.pct }))} color={c.food} />
        </ChartCard>

        {/* Hábitos */}
        <ChartCard title="Cuidados personales" subtitle="% de días registrados en que lo hiciste">
          {habitStats.length ? <HBar rows={habitStats} color={c.care} /> : <Empty>Sin hábitos activos</Empty>}
        </ChartCard>

        {/* Agua */}
        <ChartCard title="Agua" subtitle={`Vasos por día · meta ${goals.waterGlasses}`}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              {grid}
              {xAxis}
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip fmtLabel={labelFmt} fmtValue={(v) => `${v} vasos`} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
              <ReferenceLine y={goals.waterGlasses} stroke={c.goal} strokeDasharray="4 4" strokeOpacity={0.6} />
              <Bar dataKey="water" name="Vasos" fill={c.water} radius={[4, 4, 0, 0]} stroke={c.surface} strokeWidth={period > 30 ? 0 : 2} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {profile.trackWeight && (
          <ChartCard title="Peso" subtitle={weights.length ? `Último: ${fmtNum(weights[weights.length - 1].weightKg)} kg` : 'Sin registros en el período'}>
            {weights.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={weights} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  {grid}
                  {xAxis}
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v, 1)} allowDecimals />
                  <Tooltip content={<Tip fmtLabel={labelFmt} fmtValue={(v) => `${fmtNum(v)} kg`} />} />
                  <Line type="monotone" dataKey="weightKg" name="Peso" stroke={c.single} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty>Registra tu peso al menos 2 veces para ver la tendencia.</Empty>
            )}
          </ChartCard>
        )}
      </div>
    </>
  )
}

/** Barras horizontales simples en HTML (una serie, un color). */
function HBar({ rows, color }: { rows: { name: string; pct: number }[]; color: string }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-2 text-sm" title={`${r.name}: ${r.pct} %`}>
          <span className="truncate font-semibold">{r.name}</span>
          <span className="h-3 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-r-[4px]" style={{ width: `${r.pct}%`, background: color }} />
          </span>
          <span className="text-right text-xs font-bold text-muted">{r.pct} %</span>
        </li>
      ))}
    </ul>
  )
}
