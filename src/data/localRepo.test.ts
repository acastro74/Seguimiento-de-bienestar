import { describe, expect, it } from 'vitest'
import { emptyDay } from './defaults'
import { DEMO_STORAGE_KEY, LocalRepo } from './localRepo'

class MemStorage implements Storage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
}

describe('LocalRepo', () => {
  it('dos pestañas que guardan días distintos no se pisan', async () => {
    const storage = new MemStorage()
    const tabA = new LocalRepo(storage)
    const tabB = new LocalRepo(storage)
    // Ambas pestañas cargaron antes de guardar
    expect(await tabA.listDays('2026-01-01', '2026-12-31')).toEqual([])
    expect(await tabB.listDays('2026-01-01', '2026-12-31')).toEqual([])

    await tabA.saveDay({ ...emptyDay('2026-10-07'), mood: 8 })
    await tabB.saveDay({ ...emptyDay('2026-10-08'), mood: 6 })
    await tabB.saveProfile({ name: 'B', trackWeight: false, trackCycle: false, goals: {} as never, onboarded: true })

    const fresh = new LocalRepo(storage)
    const days = await fresh.listDays('2026-01-01', '2026-12-31')
    expect(days.map((d) => [d.date, d.mood])).toEqual([
      ['2026-10-07', 8],
      ['2026-10-08', 6],
    ])
    expect((await tabA.getDay('2026-10-08'))?.mood).toBe(6)
  })

  it('lee datos guardados por la versión anterior (mismo formato)', async () => {
    const storage = new MemStorage()
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ days: { '2026-10-01': { date: '2026-10-01', mood: 5 } } }))
    const repo = new LocalRepo(storage)
    const d = await repo.getDay('2026-10-01')
    expect(d?.mood).toBe(5)
    expect(d?.meals).toEqual([])
    expect(await repo.getProfile()).toBeNull()
  })
})
