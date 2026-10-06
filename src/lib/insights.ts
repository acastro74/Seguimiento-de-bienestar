import type { DayEntry, Goals, Habit } from '@/data/types'
import { shiftISO } from './dates'
import { dayMetrics, fmtNum, isLogged, type DayMetrics } from './stats'

/**
 * Hallazgos: compara el promedio de un resultado (ánimo, energía, sueño…) entre los días
 * en que se cumplió un factor y los días en que no. Son correlaciones, no causas.
 */

interface Outcome {
  key: string
  label: string
  get: (m: DayMetrics) => number | null
  /** Diferencia mínima para considerar el hallazgo relevante */
  minDiff: number
  /** true si un valor más alto es mejor (estrés: false) */
  higherIsBetter: boolean
  digits: number
  unit?: string
}

const OUTCOMES = {
  mood: { key: 'mood', label: 'ánimo', get: (m) => m.mood, minDiff: 0.5, higherIsBetter: true, digits: 1 },
  energy: { key: 'energy', label: 'energía', get: (m) => m.energy, minDiff: 0.5, higherIsBetter: true, digits: 1 },
  stress: { key: 'stress', label: 'estrés', get: (m) => m.stress, minDiff: 0.5, higherIsBetter: false, digits: 1 },
  sleepQuality: {
    key: 'sleepQuality',
    label: 'calidad del sueño (1–5)',
    get: (m) => m.sleepQuality,
    minDiff: 0.4,
    higherIsBetter: true,
    digits: 1,
  },
  efficiency: {
    key: 'efficiency',
    label: 'eficiencia del sueño',
    get: (m) => m.efficiency,
    minDiff: 3,
    higherIsBetter: true,
    digits: 0,
    unit: ' %',
  },
  sleepH: { key: 'sleepH', label: 'horas de sueño', get: (m) => m.sleepH, minDiff: 0.3, higherIsBetter: true, digits: 1, unit: ' h' },
} satisfies Record<string, Outcome>

interface Factor {
  id: string
  /** Frase que completa: "Los días que …" o "Las noches después de …" */
  phrase: string
  emoji: string
  test: (m: DayMetrics) => boolean | null
  /** Resultados del mismo día */
  sameDay: Outcome[]
  /** Resultados de la noche siguiente (el sueño se registra en el día siguiente) */
  nextNight: Outcome[]
}

export interface Insight {
  id: string
  emoji: string
  text: string
  withAvg: number
  withoutAvg: number
  nWith: number
  nWithout: number
  /** El factor se asocia con un resultado mejor */
  positive: boolean
  effect: number
}

export const MIN_DAYS_PER_GROUP = 5

function factors(goals: Goals, habits: Habit[]): Factor[] {
  const { mood, energy, stress, sleepQuality, efficiency, sleepH } = OUTCOMES
  const list: Factor[] = [
    {
      id: 'sleep-goal',
      phrase: `dormiste ${fmtNum(goals.sleepHours)} h o más`,
      emoji: '🌙',
      test: (m) => (m.sleepH == null ? null : m.sleepH >= goals.sleepHours),
      sameDay: [mood, energy, stress],
      nextNight: [],
    },
    {
      id: 'efficiency-goal',
      phrase: `tu eficiencia de sueño fue ≥ ${goals.sleepEfficiency} %`,
      emoji: '🛏️',
      test: (m) => (m.efficiency == null ? null : m.efficiency >= goals.sleepEfficiency),
      sameDay: [mood, energy],
      nextNight: [],
    },
    {
      id: 'exercise',
      phrase: 'hiciste ejercicio',
      emoji: '🏃',
      test: (m) => m.exerciseMin > 0,
      sameDay: [mood, energy, stress],
      nextNight: [sleepQuality, efficiency],
    },
    {
      id: 'water-goal',
      phrase: `tomaste ${goals.waterGlasses} vasos de agua o más`,
      emoji: '💧',
      test: (m) => m.water >= goals.waterGlasses,
      sameDay: [energy, mood],
      nextNight: [],
    },
    {
      id: 'veg-goal',
      phrase: `comiste vegetales en ${goals.vegMealsDay} comidas o más`,
      emoji: '🥦',
      test: (m) => m.vegMeals >= goals.vegMealsDay,
      sameDay: [energy, mood],
      nextNight: [],
    },
    {
      id: 'late-caffeine',
      phrase: 'tomaste cafeína después de las 16:00',
      emoji: '☕',
      test: (m) => m.lateCaffeine,
      sameDay: [],
      nextNight: [sleepQuality, efficiency, sleepH],
    },
    {
      id: 'alcohol',
      phrase: 'tomaste alcohol',
      emoji: '🍷',
      test: (m) => m.alcohol > 0,
      sameDay: [],
      nextNight: [sleepQuality, efficiency],
    },
    {
      id: 'period',
      phrase: 'estabas con el período',
      emoji: '🌸',
      test: (m) => m.cyclePeriod,
      sameDay: [energy, mood],
      nextNight: [],
    },
  ]
  for (const h of habits.filter((h) => h.active)) {
    list.push({
      id: `habit-${h.id}`,
      phrase: `hiciste «${h.name}»`,
      emoji: h.emoji,
      test: (m) => m.habitIds.includes(h.id),
      sameDay: [mood, energy, stress],
      nextNight: [sleepQuality],
    })
  }
  return list
}

function meanSd(xs: number[]) {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, xs.length - 1)
  return { mean, sd: Math.sqrt(variance) }
}

export function computeInsights(entries: DayEntry[], goals: Goals, habits: Habit[], limit = 8): Insight[] {
  const byDate = new Map(entries.filter(isLogged).map((e) => [e.date, dayMetrics(e)]))
  const out: Insight[] = []

  for (const f of factors(goals, habits)) {
    const pairs: [Outcome, boolean][] = [...f.sameDay.map((o) => [o, false] as [Outcome, boolean]), ...f.nextNight.map((o) => [o, true] as [Outcome, boolean])]
    for (const [o, next] of pairs) {
      const yes: number[] = []
      const no: number[] = []
      for (const m of byDate.values()) {
        const c = f.test(m)
        if (c == null) continue
        const target = next ? byDate.get(shiftISO(m.date, 1)) : m
        const v = target ? o.get(target) : null
        if (v == null) continue
        ;(c ? yes : no).push(v)
      }
      if (yes.length < MIN_DAYS_PER_GROUP || no.length < MIN_DAYS_PER_GROUP) continue

      const a = meanSd(yes)
      const b = meanSd(no)
      const diff = a.mean - b.mean
      if (Math.abs(diff) < o.minDiff) continue
      const pooled = Math.sqrt((a.sd ** 2 + b.sd ** 2) / 2) || 1
      const effect = Math.abs(diff) / pooled
      if (effect < 0.3) continue

      const fa = `${fmtNum(a.mean, o.digits)}${o.unit ?? ''}`
      const fb = `${fmtNum(b.mean, o.digits)}${o.unit ?? ''}`
      const text = next
        ? `Las noches después de que ${f.phrase}, tu ${o.label} fue ${fa} vs ${fb} las demás noches.`
        : `Los días que ${f.phrase}, tu ${o.label} promedio fue ${fa} vs ${fb} los demás días.`
      out.push({
        id: `${f.id}:${o.key}:${next ? 'n' : 'd'}`,
        emoji: f.emoji,
        text,
        withAvg: a.mean,
        withoutAvg: b.mean,
        nWith: yes.length,
        nWithout: no.length,
        positive: diff > 0 === o.higherIsBetter,
        effect,
      })
    }
  }
  return out.sort((x, y) => y.effect - x.effect).slice(0, limit)
}
