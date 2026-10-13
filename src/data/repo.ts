import type { DayEntry, Habit, ISODate, Medication, Profile } from './types'

/** Acceso a datos. Implementado por Supabase (nube) y por localStorage (modo demo). */
export interface Repo {
  readonly mode: 'cloud' | 'demo'
  getProfile(): Promise<Profile | null>
  saveProfile(p: Profile): Promise<void>
  listHabits(): Promise<Habit[]>
  saveHabit(h: Habit): Promise<void>
  deleteHabit(id: string): Promise<void>
  listMedications(): Promise<Medication[]>
  saveMedication(m: Medication): Promise<void>
  deleteMedication(id: string): Promise<void>
  getDay(date: ISODate): Promise<DayEntry | null>
  saveDay(d: DayEntry): Promise<void>
  /** Guarda varios días de una vez (importar respaldo) */
  saveDays(days: DayEntry[]): Promise<void>
  /** Días con registro entre `from` y `to` (incluidas) */
  listDays(from: ISODate, to: ISODate): Promise<DayEntry[]>
  /** Último registro anterior a `date` (para pre-llenar horas de sueño) */
  previousDay(date: ISODate): Promise<DayEntry | null>
}
