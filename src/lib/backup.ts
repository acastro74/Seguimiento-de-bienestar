import type { DayEntry, Habit, Medication, Profile } from '@/data/types'
import { emptyDay, emptySleep, uid } from '@/data/defaults'

export const BACKUP_APP = 'bitacora-bienestar'

export interface Backup {
  app: typeof BACKUP_APP
  version: 1
  exportedAt: string
  profile: Profile | null
  habits: Habit[]
  medications: Medication[]
  days: DayEntry[]
}

export function buildBackup(profile: Profile | null, habits: Habit[], medications: Medication[], days: DayEntry[]): Backup {
  return { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), profile, habits, medications, days }
}

export interface ImportPlan {
  /** Hábitos que no existen (por nombre) y hay que crear */
  newHabits: Habit[]
  newMeds: Medication[]
  /** Días con IDs de hábitos y medicamentos ya traducidos a los de esta cuenta */
  days: DayEntry[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const norm = (s: string) => s.trim().toLocaleLowerCase('es')

/** Lee y valida un archivo de respaldo. Lanza un error con mensaje en español si no es válido. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un respaldo válido (no es JSON).')
  }
  const b = data as Partial<Backup>
  if (!b || b.app !== BACKUP_APP || !Array.isArray(b.days)) {
    throw new Error('El archivo no es un respaldo de Bitácora de Bienestar.')
  }
  if (b.version !== 1) throw new Error('Versión de respaldo no soportada.')
  return {
    app: BACKUP_APP,
    version: 1,
    exportedAt: String(b.exportedAt ?? ''),
    profile: b.profile ?? null,
    habits: Array.isArray(b.habits) ? b.habits : [],
    medications: Array.isArray(b.medications) ? b.medications : [],
    days: b.days.filter((d) => d && typeof d.date === 'string' && DATE.test(d.date)),
  }
}

/**
 * Prepara la importación: reutiliza hábitos y medicamentos que ya existen con el mismo nombre,
 * crea los que faltan y traduce los IDs dentro de cada día.
 */
export function planImport(b: Backup, existingHabits: Habit[], existingMeds: Medication[]): ImportPlan {
  const habitId = new Map<string, string>()
  const newHabits: Habit[] = []
  const habitByName = new Map(existingHabits.map((h) => [norm(h.name), h]))
  const takenIds = new Set([...existingHabits.map((h) => h.id), ...existingMeds.map((m) => m.id)])
  const freshId = (id: string) => {
    const ok = UUID.test(id) && !takenIds.has(id)
    const out = ok ? id : uid()
    takenIds.add(out)
    return out
  }

  for (const h of b.habits) {
    const match = habitByName.get(norm(h.name))
    if (match) {
      habitId.set(h.id, match.id)
      continue
    }
    const created: Habit = { ...h, id: freshId(h.id), sort: existingHabits.length + newHabits.length }
    newHabits.push(created)
    habitByName.set(norm(h.name), created)
    habitId.set(h.id, created.id)
  }

  const medId = new Map<string, string>()
  const newMeds: Medication[] = []
  const medByName = new Map(existingMeds.map((m) => [norm(m.name), m]))
  for (const m of b.medications) {
    const match = medByName.get(norm(m.name))
    if (match) {
      medId.set(m.id, match.id)
      continue
    }
    const created: Medication = { ...m, id: freshId(m.id) }
    newMeds.push(created)
    medByName.set(norm(m.name), created)
    medId.set(m.id, created.id)
  }

  const days = b.days.map((raw) => {
    const d: DayEntry = { ...emptyDay(raw.date), ...raw, sleep: { ...emptySleep(), ...(raw.sleep ?? {}) } }
    return {
      ...d,
      habitIds: (d.habitIds ?? []).map((id) => habitId.get(id)).filter((x): x is string => !!x),
      intakes: (d.intakes ?? [])
        .map((i) => (i.kind === 'medicamento' ? { ...i, medicationId: i.medicationId ? (medId.get(i.medicationId) ?? null) : null } : i))
        .filter((i) => i.kind !== 'medicamento' || i.medicationId),
      meals: d.meals ?? [],
      exercise: d.exercise ?? [],
      cycleSymptoms: d.cycleSymptoms ?? [],
    }
  })

  return { newHabits, newMeds, days }
}
