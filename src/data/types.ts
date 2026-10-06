/** Fecha local en formato yyyy-MM-dd */
export type ISODate = string
/** Hora local en formato HH:mm */
export type HHMM = string

export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack'
export type FoodGroup = 'proteina' | 'carbohidrato' | 'vegetales' | 'fruta' | 'lacteos'
export type ExerciseType = 'fuerza' | 'cardio' | 'movilidad' | 'caminata' | 'otro'
export type Intensity = 'suave' | 'media' | 'alta'
export type IntakeKind = 'cafeina' | 'alcohol' | 'medicamento'
export type CycleFlow = 'leve' | 'medio' | 'abundante'

export interface Meal {
  id: string
  type: MealType
  groups: FoodGroup[]
  description: string
}

export interface ExerciseSession {
  id: string
  type: ExerciseType
  minutes: number
  intensity: Intensity
}

export interface Intake {
  id: string
  kind: IntakeKind
  /** Solo para kind = 'medicamento' */
  medicationId: string | null
  /** Tazas, tragos o dosis */
  amount: number
  time: HHMM | null
}

/** Diario del sueño (Consensus Sleep Diary). Corresponde a la noche ANTERIOR a la fecha del registro. */
export interface SleepLog {
  bedTime: HHMM | null
  lightsOff: HHMM | null
  latencyMin: number | null
  awakenings: number | null
  awakeMin: number | null
  finalWake: HHMM | null
  wokeEarlyMin: number | null
  outOfBed: HHMM | null
  /** Horas dormidas que la persona reporta (si no, se calculan) */
  hoursReported: number | null
  /** 1 Muy mala … 5 Muy buena */
  quality: number | null
  /** 1 Nada descansad@ … 5 Muy descansad@ */
  rested: number | null
  napMin: number | null
  napStart: HHMM | null
  comment: string
}

export interface DayEntry {
  date: ISODate
  mood: number | null
  energy: number | null
  stress: number | null
  water: number
  note: string
  weightKg: number | null
  waistCm: number | null
  cyclePeriod: boolean | null
  cycleFlow: CycleFlow | null
  cycleSymptoms: string[]
  sleep: SleepLog
  meals: Meal[]
  exercise: ExerciseSession[]
  habitIds: string[]
  intakes: Intake[]
}

export interface Goals {
  waterGlasses: number
  sleepHours: number
  sleepEfficiency: number
  exerciseMinWeek: number
  vegMealsDay: number
}

export interface Profile {
  name: string
  trackWeight: boolean
  trackCycle: boolean
  goals: Goals
  onboarded: boolean
}

export interface Habit {
  id: string
  name: string
  emoji: string
  active: boolean
  sort: number
}

export interface Medication {
  id: string
  name: string
  dose: string
  sleepAid: boolean
  active: boolean
}
