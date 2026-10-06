import type { HHMM, SleepLog } from '@/data/types'

const DAY = 24 * 60

/** Minutos desde el mediodía del día anterior: las horas de la mañana quedan "después" de las de la noche. */
export function nightMinutes(t: HHMM): number {
  const [h, m] = t.split(':').map(Number)
  const mins = h * 60 + m
  return mins < 12 * 60 ? mins + DAY : mins
}

/** Duración en minutos entre dos horas de la misma noche (maneja el cruce de medianoche). */
export function spanMinutes(from: HHMM, to: HHMM): number {
  let d = nightMinutes(to) - nightMinutes(from)
  if (d < 0) d += DAY
  return d
}

export interface SleepMetrics {
  /** Horas en cama: desde que se metió a la cama hasta que se levantó */
  timeInBedH: number | null
  /** Horas dormidas calculadas desde los tiempos del diario */
  computedAsleepH: number | null
  /** Horas dormidas a usar: reportadas por la persona o, si no hay, calculadas */
  asleepH: number | null
  /** Eficiencia del sueño (%) = horas dormidas / horas en cama */
  efficiency: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function sleepMetrics(s: SleepLog): SleepMetrics {
  const timeInBedMin = s.bedTime && s.outOfBed ? spanMinutes(s.bedTime, s.outOfBed) : null

  let computedMin: number | null = null
  const start = s.lightsOff ?? s.bedTime
  if (start && s.finalWake) {
    computedMin = spanMinutes(start, s.finalWake) - (s.latencyMin ?? 0) - (s.awakeMin ?? 0)
    if (computedMin < 0) computedMin = 0
  }

  const asleepMin = s.hoursReported != null ? s.hoursReported * 60 : computedMin
  const efficiency =
    asleepMin != null && timeInBedMin ? Math.min(100, Math.round((asleepMin / timeInBedMin) * 100)) : null

  return {
    timeInBedH: timeInBedMin != null ? round1(timeInBedMin / 60) : null,
    computedAsleepH: computedMin != null ? round1(computedMin / 60) : null,
    asleepH: asleepMin != null ? round1(asleepMin / 60) : null,
    efficiency,
  }
}

export const formatHours = (h: number | null | undefined) => {
  if (h == null) return '—'
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm ? `${hh} h ${mm} min` : `${hh} h`
}
