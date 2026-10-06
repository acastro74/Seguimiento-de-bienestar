import { describe, expect, it } from 'vitest'
import { emptySleep } from '@/data/defaults'
import { sleepMetrics, spanMinutes } from './sleep'

describe('spanMinutes', () => {
  it('cruza la medianoche', () => {
    expect(spanMinutes('22:15', '07:47')).toBe(572)
    expect(spanMinutes('23:30', '00:30')).toBe(60)
  })
  it('acostarse después de medianoche', () => {
    expect(spanMinutes('01:00', '08:00')).toBe(420)
  })
})

describe('sleepMetrics', () => {
  it('reproduce el ejemplo del diario del sueño (≈ 7 / 9,5 h = 74 %)', () => {
    const m = sleepMetrics({
      ...emptySleep(),
      bedTime: '22:15',
      lightsOff: '22:20',
      latencyMin: 20,
      awakenings: 5,
      awakeMin: 90,
      finalWake: '07:45',
      outOfBed: '07:47',
      hoursReported: 7,
    })
    expect(m.timeInBedH).toBe(9.5)
    expect(m.asleepH).toBe(7)
    expect(m.efficiency).toBeGreaterThanOrEqual(73)
    expect(m.efficiency).toBeLessThanOrEqual(74)
    // 22:20 → 07:45 = 565 min − 20 − 90 = 455 min
    expect(m.computedAsleepH).toBe(7.6)
  })

  it('usa las horas calculadas si no hay reportadas', () => {
    const m = sleepMetrics({ ...emptySleep(), bedTime: '23:00', lightsOff: '23:00', finalWake: '07:00', outOfBed: '07:00' })
    expect(m.asleepH).toBe(8)
    expect(m.efficiency).toBe(100)
  })

  it('devuelve nulos si faltan datos', () => {
    const m = sleepMetrics(emptySleep())
    expect(m).toEqual({ timeInBedH: null, computedAsleepH: null, asleepH: null, efficiency: null })
  })

  it('solo horas reportadas: sin eficiencia', () => {
    const m = sleepMetrics({ ...emptySleep(), hoursReported: 6.5 })
    expect(m.asleepH).toBe(6.5)
    expect(m.efficiency).toBeNull()
  })
})
