import type {
  DayEntry,
  ExerciseType,
  FoodGroup,
  Goals,
  Habit,
  Intensity,
  ISODate,
  MealType,
  Profile,
  SleepLog,
} from './types'

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const DEFAULT_GOALS: Goals = {
  waterGlasses: 8,
  sleepHours: 7,
  sleepEfficiency: 85,
  exerciseMinWeek: 150,
  vegMealsDay: 2,
}

export const emptyProfile = (): Profile => ({
  name: '',
  trackWeight: false,
  trackCycle: false,
  goals: { ...DEFAULT_GOALS },
  onboarded: false,
})

export const emptySleep = (): SleepLog => ({
  bedTime: null,
  lightsOff: null,
  latencyMin: null,
  awakenings: null,
  awakeMin: null,
  finalWake: null,
  wokeEarlyMin: null,
  outOfBed: null,
  hoursReported: null,
  quality: null,
  rested: null,
  napMin: null,
  napStart: null,
  comment: '',
})

export const emptyDay = (date: ISODate): DayEntry => ({
  date,
  mood: null,
  energy: null,
  stress: null,
  water: 0,
  note: '',
  weightKg: null,
  waistCm: null,
  cyclePeriod: null,
  cycleFlow: null,
  cycleSymptoms: [],
  sleep: emptySleep(),
  meals: [],
  exercise: [],
  habitIds: [],
  intakes: [],
})

export const DEFAULT_HABITS: Omit<Habit, 'id'>[] = [
  { name: 'Meditación', emoji: '🧘', active: true, sort: 0 },
  { name: 'Lectura', emoji: '📖', active: true, sort: 1 },
  { name: 'Sol / aire libre', emoji: '🌤️', active: true, sort: 2 },
  { name: 'Sin pantallas 1 h antes de dormir', emoji: '📵', active: true, sort: 3 },
  { name: 'Skincare', emoji: '🧴', active: true, sort: 4 },
  { name: 'Terapia', emoji: '💬', active: true, sort: 5 },
  { name: 'Tiempo social', emoji: '🫂', active: true, sort: 6 },
  { name: 'Estiramiento', emoji: '🤸', active: true, sort: 7 },
]

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snacks' },
]

export const FOOD_GROUPS: { value: FoodGroup; label: string; short: string; emoji: string }[] = [
  { value: 'proteina', label: 'Proteína', short: 'P', emoji: '🍗' },
  { value: 'carbohidrato', label: 'Carbohidrato', short: 'C', emoji: '🍞' },
  { value: 'vegetales', label: 'Vegetales', short: 'V', emoji: '🥦' },
  { value: 'fruta', label: 'Fruta', short: 'F', emoji: '🍎' },
  { value: 'lacteos', label: 'Lácteos', short: 'L', emoji: '🥛' },
]

export const EXERCISE_TYPES: { value: ExerciseType; label: string; emoji: string }[] = [
  { value: 'fuerza', label: 'Fuerza', emoji: '🏋️' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'movilidad', label: 'Movilidad / Yoga', emoji: '🧘' },
  { value: 'caminata', label: 'Caminata', emoji: '🚶' },
  { value: 'otro', label: 'Otro', emoji: '⚡' },
]

export const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'suave', label: 'Suave' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
]

export const SLEEP_QUALITY = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Muy buena']
export const RESTED = ['Nada', 'Un poco', 'Algo', 'Descansad@', 'Muy descansad@']

export const CYCLE_SYMPTOMS = ['Cólicos', 'Hinchazón', 'Dolor de cabeza', 'Sensibilidad', 'Antojos', 'Acné', 'Cansancio']

export const label = <T extends string>(list: { value: T; label: string }[], v: T) =>
  list.find((x) => x.value === v)?.label ?? v
