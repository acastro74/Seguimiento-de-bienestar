import type { Repo } from './repo'
import type { DayEntry, Habit, ISODate, Medication, Profile } from './types'
import { emptyDay } from './defaults'

const KEY = 'bitacora-demo-v1'

interface Store {
  profile: Profile | null
  habits: Habit[]
  medications: Medication[]
  days: Record<ISODate, DayEntry>
}

const blank = (): Store => ({ profile: null, habits: [], medications: [], days: {} })

/** Modo demo: todo se guarda en localStorage de este navegador. */
export class LocalRepo implements Repo {
  readonly mode = 'demo' as const
  private mem: Store | null = null

  private load(): Store {
    if (this.mem) return this.mem
    try {
      const raw = localStorage.getItem(KEY)
      this.mem = raw ? { ...blank(), ...JSON.parse(raw) } : blank()
    } catch {
      this.mem = blank()
    }
    return this.mem!
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.mem))
    } catch {
      /* almacenamiento no disponible: se mantiene en memoria */
    }
  }

  replaceAll(s: Store) {
    this.mem = s
    this.persist()
  }

  reset() {
    this.mem = blank()
    this.persist()
  }

  async getProfile() {
    return this.load().profile
  }
  async saveProfile(p: Profile) {
    this.load().profile = p
    this.persist()
  }
  async listHabits() {
    return [...this.load().habits].sort((a, b) => a.sort - b.sort)
  }
  async saveHabit(h: Habit) {
    const s = this.load()
    s.habits = [...s.habits.filter((x) => x.id !== h.id), h]
    this.persist()
  }
  async deleteHabit(id: string) {
    const s = this.load()
    s.habits = s.habits.filter((x) => x.id !== id)
    this.persist()
  }
  async listMedications() {
    return [...this.load().medications]
  }
  async saveMedication(m: Medication) {
    const s = this.load()
    s.medications = [...s.medications.filter((x) => x.id !== m.id), m]
    this.persist()
  }
  async deleteMedication(id: string) {
    const s = this.load()
    s.medications = s.medications.filter((x) => x.id !== id)
    this.persist()
  }
  async getDay(date: ISODate) {
    const d = this.load().days[date]
    return d ? { ...emptyDay(date), ...d } : null
  }
  async saveDay(d: DayEntry) {
    this.load().days[d.date] = d
    this.persist()
  }
  async listDays(from: ISODate, to: ISODate) {
    return Object.values(this.load().days)
      .filter((d) => d.date >= from && d.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  async previousDay(date: ISODate) {
    const prev = Object.keys(this.load().days)
      .filter((d) => d < date)
      .sort()
      .pop()
    return prev ? this.load().days[prev] : null
  }
}
