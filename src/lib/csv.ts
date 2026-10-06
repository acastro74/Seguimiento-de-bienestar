import type { DayEntry, Habit, Medication } from '@/data/types'
import { EXERCISE_TYPES, FOOD_GROUPS, MEAL_TYPES, label } from '@/data/defaults'
import { sleepMetrics } from './sleep'

const esc = (v: unknown): string => {
  if (v == null) return ''
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEADERS = [
  'fecha',
  'animo',
  'energia',
  'estres',
  'agua_vasos',
  'hora_cama',
  'hora_apago_luz',
  'latencia_min',
  'despertares',
  'min_despierto',
  'hora_despertar',
  'hora_levantarse',
  'horas_en_cama',
  'horas_dormidas',
  'eficiencia_sueno_pct',
  'calidad_sueno_1a5',
  'descanso_1a5',
  'siesta_min',
  'desayuno',
  'almuerzo',
  'cena',
  'snacks',
  'ejercicio',
  'ejercicio_min_total',
  'cuidados_personales',
  'cafeina',
  'alcohol',
  'medicamentos',
  'peso_kg',
  'cintura_cm',
  'periodo',
  'sintomas_ciclo',
  'nota',
  'comentario_sueno',
]

/** CSV con una fila por día. Usa coma como separador y BOM para que Excel lea bien los acentos. */
export function toCSV(entries: DayEntry[], habits: Habit[], meds: Medication[]): string {
  const habitName = new Map(habits.map((h) => [h.id, h.name]))
  const medName = new Map(meds.map((m) => [m.id, m.name]))
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const s = sleepMetrics(e.sleep)
      const meal = (t: string) =>
        e.meals
          .filter((m) => m.type === t)
          .map((m) => {
            const groups = m.groups.map((g) => FOOD_GROUPS.find((x) => x.value === g)?.short ?? g).join('')
            return [groups && `[${groups}]`, m.description].filter(Boolean).join(' ')
          })
          .join(' | ')
      const intake = (k: string) =>
        e.intakes
          .filter((i) => i.kind === k)
          .map((i) => {
            const name = k === 'medicamento' ? (medName.get(i.medicationId ?? '') ?? 'medicamento') : `${i.amount}`
            return i.time ? `${name} @${i.time}` : name
          })
          .join(' | ')
      return [
        e.date,
        e.mood,
        e.energy,
        e.stress,
        e.water,
        e.sleep.bedTime,
        e.sleep.lightsOff,
        e.sleep.latencyMin,
        e.sleep.awakenings,
        e.sleep.awakeMin,
        e.sleep.finalWake,
        e.sleep.outOfBed,
        s.timeInBedH,
        s.asleepH,
        s.efficiency,
        e.sleep.quality,
        e.sleep.rested,
        e.sleep.napMin,
        ...MEAL_TYPES.map((t) => meal(t.value)),
        e.exercise.map((x) => `${label(EXERCISE_TYPES, x.type)} ${x.minutes} min (${x.intensity})`).join(' | '),
        e.exercise.reduce((a, x) => a + x.minutes, 0),
        e.habitIds.map((id) => habitName.get(id) ?? id).join(' | '),
        intake('cafeina'),
        intake('alcohol'),
        intake('medicamento'),
        e.weightKg,
        e.waistCm,
        e.cyclePeriod == null ? '' : e.cyclePeriod ? 'sí' : 'no',
        e.cycleSymptoms.join(' | '),
        e.note,
        e.sleep.comment,
      ]
        .map(esc)
        .join(',')
    })
  return '﻿' + [HEADERS.join(','), ...rows].join('\n')
}

export function downloadFile(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
