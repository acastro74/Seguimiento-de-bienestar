import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS, emptyDay } from '@/data/defaults'
import type { DayEntry, Habit } from '@/data/types'
import { shiftISO } from './dates'
import { computeInsights } from './insights'

const habit: Habit = { id: 'h1', name: 'Meditación', emoji: '🧘', active: true, sort: 0 }

/** 30 días: con ≥ 7 h de sueño el ánimo es 8, si no 5. La meditación no tiene efecto. */
function synthetic(): DayEntry[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = emptyDay(shiftISO('2026-09-01', i))
    const good = i % 2 === 0
    d.sleep.hoursReported = good ? 7.5 : 5.5
    d.mood = good ? 8 + (i % 3) * 0.1 : 5 + (i % 3) * 0.1
    d.energy = 6
    d.habitIds = i % 4 < 2 ? ['h1'] : []
    // cafeína tarde los días 0, 3, 6…; la noche siguiente duerme peor
    if (i % 3 === 0) d.intakes = [{ id: `c${i}`, kind: 'cafeina', medicationId: null, amount: 1, time: '17:00' }]
    return d
  }).map((d, i, all) => {
    const prevLate = i > 0 && all[i - 1].intakes.some((x) => x.kind === 'cafeina')
    d.sleep.quality = prevLate ? 2 : 4
    return d
  })
}

describe('computeInsights', () => {
  const insights = computeInsights(synthetic(), DEFAULT_GOALS, [habit], 20)

  it('detecta el efecto del sueño sobre el ánimo', () => {
    const i = insights.find((x) => x.id === 'sleep-goal:mood:d')
    expect(i).toBeDefined()
    expect(i!.positive).toBe(true)
    expect(i!.withAvg).toBeGreaterThan(7.9)
    expect(i!.withoutAvg).toBeLessThan(5.2)
    expect(i!.text).toContain('dormiste 7 h o más')
  })

  it('detecta la cafeína tarde contra el sueño de la noche siguiente', () => {
    const i = insights.find((x) => x.id === 'late-caffeine:sleepQuality:n')
    expect(i).toBeDefined()
    expect(i!.positive).toBe(false)
  })

  it('no reporta factores sin diferencia (energía constante)', () => {
    expect(insights.some((x) => x.id.endsWith(':energy:d'))).toBe(false)
  })

  it('requiere un mínimo de días por grupo', () => {
    expect(computeInsights(synthetic().slice(0, 6), DEFAULT_GOALS, [habit])).toEqual([])
  })
})
