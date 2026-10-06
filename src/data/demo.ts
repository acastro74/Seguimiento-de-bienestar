import type { DayEntry, ExerciseType, FoodGroup, Habit, Intensity, ISODate, Medication, Profile } from './types'
import { DEFAULT_GOALS, DEFAULT_HABITS, emptyDay, uid } from './defaults'
import { shiftISO } from '@/lib/dates'

/** PRNG determinista para que los datos demo sean siempre iguales. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const pad = (n: number) => String(n).padStart(2, '0')
const time = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

const MEAL_TEXT: Record<string, string[]> = {
  desayuno: ['Huevo, pan', 'Avena con frutos rojos, café', 'Yogurt con granola', 'Tostadas con palta'],
  almuerzo: ['Pollo, arroz, ensalada', 'Merluza, puré, tomate', 'Lentejas con ensalada', 'Pasta con carne'],
  cena: ['Queso, pasta, tomate', 'Sopa de verduras', 'Tortilla de verduras', 'Sándwich de pavo'],
  snack: ['Fruta', 'Frutos secos', 'Galletas', 'Yogurt'],
}

export function buildDemo(today: ISODate, days = 60) {
  const r = rng(42)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]

  const profile: Profile = { name: 'Demo', trackWeight: true, trackCycle: false, goals: { ...DEFAULT_GOALS }, onboarded: true }
  const habits: Habit[] = DEFAULT_HABITS.map((h) => ({ ...h, id: uid() }))
  const melatonina: Medication = { id: uid(), name: 'Melatonina', dose: '3 mg', sleepAid: true, active: true }
  const magnesio: Medication = { id: uid(), name: 'Magnesio', dose: '400 mg', sleepAid: false, active: true }
  const hId = (name: string) => habits.find((h) => h.name.startsWith(name))!.id

  const entries: DayEntry[] = []
  let prevLateCaffeine = false
  let prevAlcohol = false
  let prevExercise = false
  let weight = 82

  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(today, -i)
    const d = emptyDay(date)
    if (r() < 0.08 && i > 1) continue // algunos días sin registro

    // Sueño de la noche anterior: empeora con cafeína tarde / alcohol, mejora con ejercicio
    const bed = 22 * 60 + r() * 100
    const latency = Math.round(10 + r() * 25 + (prevLateCaffeine ? 20 : 0))
    const awakeMin = Math.round(15 + r() * 50 + (prevAlcohol ? 40 : 0) - (prevExercise ? 15 : 0))
    const wake = 6 * 60 + 30 + r() * 80
    const tib = wake + 1440 - bed
    const asleep = clamp(tib - latency - awakeMin - 5, 240, 560)
    d.sleep = {
      ...d.sleep,
      bedTime: time(bed),
      lightsOff: time(bed + 5),
      latencyMin: latency,
      awakenings: Math.round(1 + r() * 3 + (prevAlcohol ? 2 : 0)),
      awakeMin: Math.max(0, awakeMin),
      finalWake: time(wake),
      outOfBed: time(wake + 2 + r() * 15),
      hoursReported: Math.round((asleep / 60) * 2) / 2,
      quality: clamp(Math.round(2 + (asleep / 60 - 5.5) + (prevLateCaffeine ? -1 : 0) + r()), 1, 5),
      rested: clamp(Math.round(1.5 + (asleep / 60 - 5.5) + r()), 1, 5),
    }
    const sleepH = asleep / 60

    // Hábitos del día
    const exercise = r() < 0.55
    const meditation = r() < 0.4
    const outdoors = r() < 0.5
    const water = clamp(Math.round(4 + r() * 5), 0, 10)
    d.water = water
    if (exercise) {
      const type: ExerciseType = pick(['fuerza', 'cardio', 'caminata', 'fuerza', 'movilidad'])
      const intensity: Intensity = pick(['suave', 'media', 'media', 'alta'])
      d.exercise.push({ id: uid(), type, minutes: pick([20, 30, 40, 45, 60]), intensity })
      if (r() < 0.3) d.exercise.push({ id: uid(), type: 'cardio', minutes: pick([5, 10, 15]), intensity: 'media' })
    }
    d.habitIds = [
      meditation && hId('Meditación'),
      outdoors && hId('Sol'),
      r() < 0.35 && hId('Lectura'),
      r() < 0.3 && hId('Sin pantallas'),
      r() < 0.25 && hId('Skincare'),
      r() < 0.2 && hId('Estiramiento'),
    ].filter(Boolean) as string[]

    // Comidas
    for (const type of ['desayuno', 'almuerzo', 'cena', 'snack'] as const) {
      if (type === 'snack' && r() < 0.5) continue
      const groups = new Set<FoodGroup>()
      if (type !== 'snack' || r() < 0.3) groups.add('proteina')
      if (r() < 0.75) groups.add('carbohidrato')
      if (type !== 'desayuno' && r() < 0.65) groups.add('vegetales')
      if (r() < 0.35) groups.add('fruta')
      if (r() < 0.3) groups.add('lacteos')
      d.meals.push({ id: uid(), type, groups: [...groups], description: pick(MEAL_TEXT[type]) })
    }
    const vegMeals = d.meals.filter((m) => m.groups.includes('vegetales')).length

    // Consumos
    const lateCaffeine = r() < 0.3
    d.intakes.push({ id: uid(), kind: 'cafeina', medicationId: null, amount: 1, time: time(8 * 60 + r() * 60) })
    if (lateCaffeine) d.intakes.push({ id: uid(), kind: 'cafeina', medicationId: null, amount: 1, time: time(16 * 60 + 30 + r() * 90) })
    const alcohol = r() < 0.18
    if (alcohol) d.intakes.push({ id: uid(), kind: 'alcohol', medicationId: null, amount: pick([1, 2, 3]), time: time(20 * 60 + r() * 120) })
    if (r() < 0.6) d.intakes.push({ id: uid(), kind: 'medicamento', medicationId: melatonina.id, amount: 1, time: time(21 * 60 + 15) })
    if (r() < 0.8) d.intakes.push({ id: uid(), kind: 'medicamento', medicationId: magnesio.id, amount: 1, time: time(21 * 60) })

    // Ánimo: depende del sueño, ejercicio, meditación, sol y vegetales
    const base = 4 + (sleepH - 6) * 1.1 + (exercise ? 0.9 : 0) + (meditation ? 0.6 : 0) + (outdoors ? 0.4 : 0)
    d.mood = clamp(Math.round(base + (r() - 0.5) * 2), 1, 10)
    d.energy = clamp(Math.round(base - 0.3 + (water >= 8 ? 0.8 : 0) + (vegMeals >= 2 ? 0.5 : 0) + (r() - 0.5) * 2), 1, 10)
    d.stress = clamp(Math.round(7 - (sleepH - 6) * 0.8 - (meditation ? 1.2 : 0) - (exercise ? 0.5 : 0) + (r() - 0.5) * 2), 1, 10)

    if (date.endsWith('1') || i % 7 === 0) {
      weight += (r() - 0.6) * 0.6
      d.weightKg = Math.round(weight * 10) / 10
    }
    if (r() < 0.15) d.note = pick(['Día pesado en el trabajo', 'Muy buen día', 'Algo de dolor de cabeza', 'Salí a caminar con amigos'])

    entries.push(d)
    prevLateCaffeine = lateCaffeine
    prevAlcohol = alcohol
    prevExercise = exercise
  }

  return { profile, habits, medications: [melatonina, magnesio], days: Object.fromEntries(entries.map((e) => [e.date, e])) }
}
