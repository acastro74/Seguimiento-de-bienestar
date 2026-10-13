import { describe, expect, it } from 'vitest'
import { emptyDay } from '@/data/defaults'
import type { Habit, Medication } from '@/data/types'
import { buildBackup, parseBackup, planImport } from './backup'

const H = (id: string, name: string): Habit => ({ id, name, emoji: '✨', active: true, sort: 0 })
const M = (id: string, name: string): Medication => ({ id, name, dose: '', sleepAid: false, active: true })

const DEMO_MED = '11111111-1111-4111-8111-111111111111'
const DEMO_HABIT = '22222222-2222-4222-8222-222222222222'

describe('respaldo', () => {
  const day = {
    ...emptyDay('2026-10-07'),
    mood: 8,
    habitIds: [DEMO_HABIT, 'h-lectura'],
    intakes: [
      { id: 'i1', kind: 'medicamento' as const, medicationId: DEMO_MED, amount: 1, time: '21:15' },
      { id: 'i2', kind: 'cafeina' as const, medicationId: null, amount: 1, time: '08:00' },
    ],
  }
  const backup = buildBackup(null, [H(DEMO_HABIT, 'Meditación'), H('h-lectura', 'Lectura')], [M(DEMO_MED, 'Melatonina')], [day])

  it('ida y vuelta por JSON', () => {
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.days).toHaveLength(1)
    expect(parsed.habits).toHaveLength(2)
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(() => parseBackup('hola')).toThrow(/no es JSON/)
    expect(() => parseBackup('{"a":1}')).toThrow(/no es un respaldo/)
  })

  it('reutiliza hábitos existentes por nombre y crea los que faltan', () => {
    const existing = [H('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'meditación ')]
    const plan = planImport(backup, existing, [])
    // Meditación ya existe (mismo nombre, sin importar mayúsculas/espacios)
    expect(plan.newHabits.map((h) => h.name)).toEqual(['Lectura'])
    // 'h-lectura' no es UUID: se le asigna uno nuevo
    expect(plan.newHabits[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(plan.days[0].habitIds).toEqual(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', plan.newHabits[0].id])
    // Medicamento nuevo conserva su UUID y el consumo apunta a él
    expect(plan.newMeds[0].id).toBe(DEMO_MED)
    expect(plan.days[0].intakes.find((i) => i.kind === 'medicamento')?.medicationId).toBe(DEMO_MED)
    expect(plan.days[0].mood).toBe(8)
  })

  it('apunta los consumos al medicamento existente con el mismo nombre', () => {
    const plan = planImport(backup, [], [M('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Melatonina')])
    expect(plan.newMeds).toEqual([])
    expect(plan.days[0].intakes[0].medicationId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
  })
})
