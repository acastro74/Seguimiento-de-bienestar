import { describe, expect, it } from 'vitest'
import { emptyDay } from '@/data/defaults'
import { toCSV } from './csv'

describe('toCSV', () => {
  it('genera una fila por día con comidas, ejercicio y consumos aplanados', () => {
    const d = emptyDay('2026-08-14')
    d.mood = 8
    d.water = 7
    d.sleep = { ...d.sleep, bedTime: '22:15', outOfBed: '07:47', hoursReported: 7 }
    d.meals = [{ id: 'm1', type: 'desayuno', groups: ['proteina', 'carbohidrato'], description: 'huevo, pan' }]
    d.exercise = [{ id: 'e1', type: 'fuerza', minutes: 20, intensity: 'media' }]
    d.intakes = [{ id: 'i1', kind: 'medicamento', medicationId: 'med1', amount: 1, time: '21:15' }]
    d.note = 'día "bueno", tranquilo'
    const csv = toCSV([d], [], [{ id: 'med1', name: 'Melatonina', dose: '3 mg', sleepAid: true, active: true }])
    const [header, row] = csv.replace('﻿', '').split('\n')
    const cols = header.split(',')
    expect(row.startsWith('2026-08-14,8,,,7,22:15')).toBe(true)
    expect(row).toContain('[PC] huevo,')
    expect(row).toContain('Fuerza 20 min (media)')
    expect(row).toContain('Melatonina @21:15')
    expect(row).toContain('"día ""bueno"", tranquilo"')
    expect(cols).toContain('eficiencia_sueno_pct')
  })
})
