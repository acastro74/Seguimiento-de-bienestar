import type { Repo } from './repo'
import type { DayEntry, Habit, ISODate, Medication, Profile } from './types'
import { emptyDay } from './defaults'

export const DEMO_STORAGE_KEY = 'bitacora-demo-v1'

export interface Store {
  profile: Profile | null
  habits: Habit[]
  medications: Medication[]
  days: Record<ISODate, DayEntry>
}

const blank = (): Store => ({ profile: null, habits: [], medications: [], days: {} })

/**
 * Modo demo: todo se guarda en localStorage de este navegador.
 *
 * Cada operación lee el almacenamiento en ese momento y modifica solo lo que cambia,
 * así dos pestañas (o la app instalada y una pestaña) no se pisan entre sí.
 */
export class LocalRepo implements Repo {
  readonly mode = 'demo' as const
  /** Respaldo en memoria solo si localStorage no está disponible */
  private fallback: Store | null = null

  constructor(private storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null) {}

  private read(): Store {
    if (this.fallback) return this.fallback
    try {
      const raw = this.storage?.getItem(DEMO_STORAGE_KEY)
      return raw ? { ...blank(), ...JSON.parse(raw) } : blank()
    } catch {
      return (this.fallback = blank())
    }
  }

  private write(s: Store) {
    if (this.fallback) {
      this.fallback = s
      return
    }
    try {
      if (!this.storage) throw new Error('sin storage')
      this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(s))
    } catch {
      this.fallback = s
    }
  }

  /** Lee, aplica el cambio y escribe en un solo paso. */
  private mutate(fn: (s: Store) => void) {
    const s = this.read()
    fn(s)
    this.write(s)
  }

  replaceAll(s: Store) {
    this.write(s)
  }

  reset() {
    this.write(blank())
  }

  countDays() {
    return Object.keys(this.read().days).length
  }

  async getProfile() {
    return this.read().profile
  }
  async saveProfile(p: Profile) {
    this.mutate((s) => {
      s.profile = p
    })
  }
  async listHabits() {
    return [...this.read().habits].sort((a, b) => a.sort - b.sort)
  }
  async saveHabit(h: Habit) {
    this.mutate((s) => {
      s.habits = [...s.habits.filter((x) => x.id !== h.id), h]
    })
  }
  async deleteHabit(id: string) {
    this.mutate((s) => {
      s.habits = s.habits.filter((x) => x.id !== id)
    })
  }
  async listMedications() {
    return [...this.read().medications]
  }
  async saveMedication(m: Medication) {
    this.mutate((s) => {
      s.medications = [...s.medications.filter((x) => x.id !== m.id), m]
    })
  }
  async deleteMedication(id: string) {
    this.mutate((s) => {
      s.medications = s.medications.filter((x) => x.id !== id)
    })
  }
  async getDay(date: ISODate) {
    const d = this.read().days[date]
    return d ? { ...emptyDay(date), ...d } : null
  }
  async saveDay(d: DayEntry) {
    this.mutate((s) => {
      s.days[d.date] = d
    })
  }
  async saveDays(days: DayEntry[]) {
    this.mutate((s) => {
      for (const d of days) s.days[d.date] = d
    })
  }
  async listDays(from: ISODate, to: ISODate) {
    return Object.values(this.read().days)
      .filter((d) => d.date >= from && d.date <= to)
      .map((d) => ({ ...emptyDay(d.date), ...d }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  async previousDay(date: ISODate) {
    const days = this.read().days
    const prev = Object.keys(days)
      .filter((d) => d < date)
      .sort()
      .pop()
    return prev ? { ...emptyDay(prev), ...days[prev] } : null
  }
}
