import type { DayEntry, ExerciseType, FoodGroup, Goals, ISODate, Profile } from '@/data/types'
import { EXERCISE_TYPES, FOOD_GROUPS } from '@/data/defaults'
import { dateRange, fromISO, shiftISO, toISO } from './dates'
import { sleepMetrics } from './sleep'
import { startOfWeek } from 'date-fns'

export const LATE_CAFFEINE = '16:00'

export interface DayMetrics {
  date: ISODate
  sleepH: number | null
  efficiency: number | null
  sleepQuality: number | null
  rested: number | null
  mood: number | null
  energy: number | null
  stress: number | null
  water: number
  exerciseMin: number
  vegMeals: number
  caffeine: number
  lateCaffeine: boolean
  alcohol: number
  habitIds: string[]
  weightKg: number | null
  cyclePeriod: boolean | null
}

export function dayMetrics(e: DayEntry): DayMetrics {
  const s = sleepMetrics(e.sleep)
  const caffeine = e.intakes.filter((i) => i.kind === 'cafeina')
  return {
    date: e.date,
    sleepH: s.asleepH,
    efficiency: s.efficiency,
    sleepQuality: e.sleep.quality,
    rested: e.sleep.rested,
    mood: e.mood,
    energy: e.energy,
    stress: e.stress,
    water: e.water,
    exerciseMin: e.exercise.reduce((a, x) => a + (x.minutes || 0), 0),
    vegMeals: e.meals.filter((m) => m.groups.includes('vegetales')).length,
    caffeine: caffeine.reduce((a, x) => a + x.amount, 0),
    lateCaffeine: caffeine.some((i) => i.amount > 0 && i.time != null && i.time >= LATE_CAFFEINE),
    alcohol: e.intakes.filter((i) => i.kind === 'alcohol').reduce((a, x) => a + x.amount, 0),
    habitIds: e.habitIds,
    weightKg: e.weightKg,
    cyclePeriod: e.cyclePeriod,
  }
}

/** ¿El día tiene algún dato registrado? */
export function isLogged(e: DayEntry | undefined | null): boolean {
  if (!e) return false
  const s = e.sleep
  return (
    e.mood != null ||
    e.energy != null ||
    e.stress != null ||
    e.water > 0 ||
    e.meals.length > 0 ||
    e.exercise.length > 0 ||
    e.habitIds.length > 0 ||
    e.intakes.length > 0 ||
    e.note.trim() !== '' ||
    e.weightKg != null ||
    s.bedTime != null ||
    s.hoursReported != null ||
    s.quality != null
  )
}

export interface Section {
  key: string
  done: boolean
}

/** Secciones del check-in y si están completas (para el anillo de progreso). */
export function sections(e: DayEntry, p: Profile): Section[] {
  const out: Section[] = [
    { key: 'sueno', done: e.sleep.quality != null || sleepMetrics(e.sleep).asleepH != null },
    { key: 'animo', done: e.mood != null && e.energy != null && e.stress != null },
    { key: 'agua', done: e.water > 0 },
    { key: 'comidas', done: e.meals.some((m) => m.groups.length > 0 || m.description.trim() !== '') },
    { key: 'ejercicio', done: e.exercise.length > 0 },
    { key: 'cuidados', done: e.habitIds.length > 0 },
    { key: 'consumos', done: e.intakes.length > 0 },
  ]
  if (p.trackWeight) out.push({ key: 'peso', done: e.weightKg != null })
  if (p.trackCycle) out.push({ key: 'ciclo', done: e.cyclePeriod != null })
  return out
}

export function avg(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number' && !Number.isNaN(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** Racha de días consecutivos con registro, terminando hoy (o ayer si hoy aún no se registra). */
export function streak(logged: Set<ISODate>, today: ISODate): number {
  let d = logged.has(today) ? today : shiftISO(today, -1)
  let n = 0
  while (logged.has(d)) {
    n++
    d = shiftISO(d, -1)
  }
  return n
}

export interface Summary {
  daysInRange: number
  daysLogged: number
  sleepH: number | null
  efficiency: number | null
  mood: number | null
  energy: number | null
  stress: number | null
  waterGoalPct: number | null
  exerciseMinPerWeek: number
  vegGoalPct: number | null
  streak: number
}

export function summarize(entries: DayEntry[], goals: Goals, from: ISODate, to: ISODate, today: ISODate): Summary {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to && isLogged(e))
  const m = inRange.map(dayMetrics)
  const days = dateRange(from, to).length
  const withMeals = inRange.filter((e) => e.meals.length > 0).map(dayMetrics)
  const totalExercise = m.reduce((a, x) => a + x.exerciseMin, 0)
  return {
    daysInRange: days,
    daysLogged: inRange.length,
    sleepH: avg(m.map((x) => x.sleepH)),
    efficiency: avg(m.map((x) => x.efficiency)),
    mood: avg(m.map((x) => x.mood)),
    energy: avg(m.map((x) => x.energy)),
    stress: avg(m.map((x) => x.stress)),
    waterGoalPct: m.length ? (m.filter((x) => x.water >= goals.waterGlasses).length / m.length) * 100 : null,
    exerciseMinPerWeek: (totalExercise / days) * 7,
    vegGoalPct: withMeals.length
      ? (withMeals.filter((x) => x.vegMeals >= goals.vegMealsDay).length / withMeals.length) * 100
      : null,
    streak: streak(new Set(entries.filter(isLogged).map((e) => e.date)), today),
  }
}

/** Porcentaje de comidas registradas que incluyeron cada grupo de alimentos. */
export function plateBalance(entries: DayEntry[]): { group: FoodGroup; label: string; pct: number }[] {
  const meals = entries.flatMap((e) => e.meals).filter((m) => m.groups.length > 0)
  return FOOD_GROUPS.map((g) => ({
    group: g.value,
    label: g.label,
    pct: meals.length ? Math.round((meals.filter((m) => m.groups.includes(g.value)).length / meals.length) * 100) : 0,
  }))
}

export type WeeklyExercise = { week: ISODate } & Record<ExerciseType, number>

export function weeklyExercise(entries: DayEntry[], from: ISODate, to: ISODate): WeeklyExercise[] {
  const weeks = new Map<ISODate, WeeklyExercise>()
  const blank = (week: ISODate) =>
    Object.fromEntries([['week', week], ...EXERCISE_TYPES.map((t) => [t.value, 0])]) as WeeklyExercise
  for (const d of dateRange(from, to)) {
    const w = toISO(startOfWeek(fromISO(d), { weekStartsOn: 1 }))
    if (!weeks.has(w)) weeks.set(w, blank(w))
  }
  for (const e of entries) {
    if (e.date < from || e.date > to) continue
    const w = toISO(startOfWeek(fromISO(e.date), { weekStartsOn: 1 }))
    const row = weeks.get(w)
    if (!row) continue
    for (const s of e.exercise) row[s.type] += s.minutes || 0
  }
  return [...weeks.values()]
}

export const round = (n: number | null | undefined, digits = 1) =>
  n == null ? null : Math.round(n * 10 ** digits) / 10 ** digits

export const fmtNum = (n: number | null | undefined, digits = 1) =>
  n == null ? '—' : (round(n, digits) as number).toLocaleString('es', { maximumFractionDigits: digits })
