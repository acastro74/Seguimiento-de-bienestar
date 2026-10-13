import type { SupabaseClient } from '@supabase/supabase-js'
import type { Repo } from './repo'
import type { DayEntry, Habit, ISODate, Medication, Profile } from './types'
import { DEFAULT_GOALS } from './defaults'

type Row = Record<string, any>

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)
const num = (v: unknown) => (v == null ? null : Number(v))

function rowToDay(r: Row): DayEntry {
  return {
    date: r.date,
    mood: r.mood,
    energy: r.energy,
    stress: r.stress,
    water: r.water ?? 0,
    note: r.note ?? '',
    weightKg: num(r.weight_kg),
    waistCm: num(r.waist_cm),
    cyclePeriod: r.cycle_period,
    cycleFlow: r.cycle_flow,
    cycleSymptoms: r.cycle_symptoms ?? [],
    sleep: {
      bedTime: hhmm(r.bed_time),
      lightsOff: hhmm(r.lights_off),
      latencyMin: r.latency_min,
      awakenings: r.awakenings,
      awakeMin: r.awake_min,
      finalWake: hhmm(r.final_wake),
      wokeEarlyMin: r.woke_early_min,
      outOfBed: hhmm(r.out_of_bed),
      hoursReported: num(r.hours_reported),
      quality: r.sleep_quality,
      rested: r.rested,
      napMin: r.nap_min,
      napStart: hhmm(r.nap_start),
      comment: r.sleep_comment ?? '',
    },
    meals: r.meals ?? [],
    exercise: r.exercise ?? [],
    intakes: r.intakes ?? [],
    habitIds: r.habit_ids ?? [],
  }
}

function dayToRow(d: DayEntry, userId: string): Row {
  const s = d.sleep
  return {
    user_id: userId,
    date: d.date,
    mood: d.mood,
    energy: d.energy,
    stress: d.stress,
    water: d.water,
    note: d.note,
    weight_kg: d.weightKg,
    waist_cm: d.waistCm,
    cycle_period: d.cyclePeriod,
    cycle_flow: d.cycleFlow,
    cycle_symptoms: d.cycleSymptoms,
    bed_time: s.bedTime,
    lights_off: s.lightsOff,
    latency_min: s.latencyMin,
    awakenings: s.awakenings,
    awake_min: s.awakeMin,
    final_wake: s.finalWake,
    woke_early_min: s.wokeEarlyMin,
    out_of_bed: s.outOfBed,
    hours_reported: s.hoursReported,
    sleep_quality: s.quality,
    rested: s.rested,
    nap_min: s.napMin,
    nap_start: s.napStart,
    sleep_comment: s.comment,
    meals: d.meals,
    exercise: d.exercise,
    intakes: d.intakes,
    habit_ids: d.habitIds,
  }
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

export class SupabaseRepo implements Repo {
  readonly mode = 'cloud' as const
  constructor(
    private sb: SupabaseClient,
    private userId: string,
  ) {}

  async getProfile(): Promise<Profile | null> {
    const r = check(await this.sb.from('profiles').select('*').eq('user_id', this.userId).maybeSingle())
    if (!r) return null
    return {
      name: r.name,
      trackWeight: r.track_weight,
      trackCycle: r.track_cycle,
      goals: { ...DEFAULT_GOALS, ...(r.goals ?? {}) },
      onboarded: r.onboarded,
    }
  }
  async saveProfile(p: Profile) {
    check(
      await this.sb.from('profiles').upsert({
        user_id: this.userId,
        name: p.name,
        track_weight: p.trackWeight,
        track_cycle: p.trackCycle,
        goals: p.goals,
        onboarded: p.onboarded,
      }),
    )
  }

  async listHabits(): Promise<Habit[]> {
    const rows = check(await this.sb.from('habits').select('*').order('sort'))
    return (rows ?? []).map((r: Row) => ({ id: r.id, name: r.name, emoji: r.emoji, active: r.active, sort: r.sort }))
  }
  async saveHabit(h: Habit) {
    check(await this.sb.from('habits').upsert({ ...h, user_id: this.userId }))
  }
  async deleteHabit(id: string) {
    check(await this.sb.from('habits').delete().eq('id', id))
  }

  async listMedications(): Promise<Medication[]> {
    const rows = check(await this.sb.from('medications').select('*').order('created_at'))
    return (rows ?? []).map((r: Row) => ({
      id: r.id,
      name: r.name,
      dose: r.dose,
      sleepAid: r.sleep_aid,
      active: r.active,
    }))
  }
  async saveMedication(m: Medication) {
    check(
      await this.sb.from('medications').upsert({
        id: m.id,
        user_id: this.userId,
        name: m.name,
        dose: m.dose,
        sleep_aid: m.sleepAid,
        active: m.active,
      }),
    )
  }
  async deleteMedication(id: string) {
    check(await this.sb.from('medications').delete().eq('id', id))
  }

  async getDay(date: ISODate) {
    const r = check(await this.sb.from('day_logs').select('*').eq('date', date).maybeSingle())
    return r ? rowToDay(r) : null
  }
  async saveDay(d: DayEntry) {
    check(await this.sb.from('day_logs').upsert(dayToRow(d, this.userId)))
  }
  async saveDays(days: DayEntry[]) {
    for (let i = 0; i < days.length; i += 200) {
      check(await this.sb.from('day_logs').upsert(days.slice(i, i + 200).map((d) => dayToRow(d, this.userId))))
    }
  }
  async listDays(from: ISODate, to: ISODate) {
    const rows = check(await this.sb.from('day_logs').select('*').gte('date', from).lte('date', to).order('date'))
    return (rows ?? []).map(rowToDay)
  }
  async previousDay(date: ISODate) {
    const r = check(
      await this.sb.from('day_logs').select('*').lt('date', date).order('date', { ascending: false }).limit(1).maybeSingle(),
    )
    return r ? rowToDay(r) : null
  }
}
