import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CycleFlow, DayEntry, ExerciseType, FoodGroup, Goals, Habit, Intake, IntakeKind, Meal, MealType, Medication, SleepLog } from '@/data/types'
import { CYCLE_SYMPTOMS, EXERCISE_TYPES, FOOD_GROUPS, INTENSITIES, MEAL_TYPES, RESTED, SLEEP_QUALITY, uid } from '@/data/defaults'
import { Card, Chip, Empty, NumberField, Scale10, Segmented, Stepper, TimeField, WaterGlasses, cx } from '@/components/ui'
import { sleepMetrics, formatHours } from '@/lib/sleep'
import { fmt, nowHHMM, shiftISO } from '@/lib/dates'
import { fmtNum } from '@/lib/stats'

export type Update = (fn: (d: DayEntry) => DayEntry) => void
interface P {
  entry: DayEntry
  update: Update
}

/* ───────────── Sueño ───────────── */

export function SleepCard({ entry, update, prev, goals, done }: P & { prev: DayEntry | null; goals: Goals; done: boolean }) {
  const s = entry.sleep
  const set = (patch: Partial<SleepLog>) => update((d) => ({ ...d, sleep: { ...d.sleep, ...patch } }))
  const m = sleepMetrics(s)
  const hasDetail = s.lightsOff || s.latencyMin != null || s.awakenings != null || s.awakeMin != null || s.finalWake || s.napMin
  const [detail, setDetail] = useState(!!hasDetail)
  const prevS = prev?.sleep
  const canCopy = prevS && (prevS.bedTime || prevS.outOfBed) && !s.bedTime && !s.outOfBed

  const night = `Noche del ${fmt(shiftISO(entry.date, -1), 'EEE d')} al ${fmt(entry.date, 'EEE d')}`

  return (
    <Card area="sleep" emoji="🌙" title="Sueño de anoche" subtitle={m.asleepH != null ? `${formatHours(m.asleepH)}${m.efficiency != null ? ` · ${m.efficiency} % eficiencia` : ''}` : night} done={done}>
      <p className="mb-3 text-xs text-muted">{night}</p>
      {canCopy && (
        <button
          type="button"
          className="mb-3 w-full rounded-2xl border-2 border-dashed border-sleep/40 px-3 py-2 text-sm font-bold text-sleep hover:bg-sleep/10"
          onClick={() =>
            set({
              bedTime: prevS!.bedTime,
              lightsOff: prevS!.lightsOff,
              finalWake: prevS!.finalWake,
              outOfBed: prevS!.outOfBed,
            })
          }
        >
          ↺ Usar el mismo horario de la noche anterior ({prevS!.bedTime ?? '–'} → {prevS!.outOfBed ?? '–'})
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TimeField label="1 · Me metí a la cama" value={s.bedTime} onChange={(v) => set({ bedTime: v })} />
        <TimeField label="7 · Me levanté" value={s.outOfBed} onChange={(v) => set({ outOfBed: v })} />
      </div>

      <button type="button" onClick={() => setDetail((x) => !x)} className="mt-3 text-xs font-bold text-sleep">
        {detail ? '− Ocultar diario completo' : '+ Diario completo (latencia, despertares…)'}
      </button>

      {detail && (
        <div className="mt-3 space-y-3 rounded-2xl bg-sleep/6 p-3">
          <div className="grid grid-cols-2 gap-3">
            <TimeField label="2 · Apagué la luz" value={s.lightsOff} onChange={(v) => set({ lightsOff: v })} />
            <TimeField label="6a · Desperté finalmente" value={s.finalWake} onChange={(v) => set({ finalWake: v })} />
          </div>
          <Row label="3 · Tardé en dormirme">
            <Stepper value={s.latencyMin} onChange={(v) => set({ latencyMin: v })} step={5} max={240} unit="min" label="latencia" />
          </Row>
          <Row label="4 · Veces que desperté">
            <Stepper value={s.awakenings} onChange={(v) => set({ awakenings: v })} max={30} label="despertares" />
          </Row>
          <Row label="5 · Tiempo despiert@ en total">
            <Stepper value={s.awakeMin} onChange={(v) => set({ awakeMin: v })} step={10} max={600} unit="min" label="tiempo despierto" />
          </Row>
          <Row label="6b · Desperté antes de lo planeado">
            <Stepper value={s.wokeEarlyMin} onChange={(v) => set({ wokeEarlyMin: v })} step={10} max={300} unit="min" label="desperté antes" />
          </Row>
          <Row label="12 · Siesta ayer">
            <Stepper value={s.napMin} onChange={(v) => set({ napMin: v })} step={10} max={300} unit="min" label="siesta" />
          </Row>
        </div>
      )}

      <Row label="8 · Horas que dormí" className="mt-3">
        <Stepper value={s.hoursReported} onChange={(v) => set({ hoursReported: v })} step={0.5} max={16} unit="h" label="horas dormidas" />
      </Row>
      {m.computedAsleepH != null && s.hoursReported == null && (
        <p className="-mt-1 mb-1 text-right text-xs text-muted">
          Según tus horarios: ~{fmtNum(m.computedAsleepH)} h{' '}
          <button type="button" className="font-bold text-sleep" onClick={() => set({ hoursReported: Math.round(m.computedAsleepH! * 2) / 2 })}>
            usar
          </button>
        </p>
      )}

      <EfficiencyBar timeInBed={m.timeInBedH} asleep={m.asleepH} efficiency={m.efficiency} goal={goals.sleepEfficiency} />

      <div className="mt-3 space-y-3">
        <div>
          <span className="mb-1 block text-xs font-bold text-muted">9 · Calidad del sueño</span>
          <Segmented area="sleep" allowClear value={s.quality} onChange={(v) => set({ quality: v })} options={SLEEP_QUALITY.map((l, i) => ({ value: i + 1, label: l }))} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-bold text-muted">10 · ¿Qué tan descansad@ te sentiste?</span>
          <Segmented area="sleep" allowClear value={s.rested} onChange={(v) => set({ rested: v })} options={RESTED.map((l, i) => ({ value: i + 1, label: l }))} />
        </div>
        <input className="field text-sm" placeholder="13 · Comentarios del sueño (opcional)" value={s.comment} onChange={(e) => set({ comment: e.target.value })} />
        <p className="text-[11px] text-muted">💊 La ayuda para dormir (11) y ☕🍷 cafeína/alcohol (12) se registran en sus tarjetas más abajo.</p>
      </div>
    </Card>
  )
}

function EfficiencyBar({ timeInBed, asleep, efficiency, goal }: { timeInBed: number | null; asleep: number | null; efficiency: number | null; goal: number }) {
  if (timeInBed == null && asleep == null) return null
  const ok = efficiency != null && efficiency >= goal
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="flex justify-between text-xs">
        <span>
          En cama <b>{formatHours(timeInBed)}</b>
        </span>
        <span>
          Dormid@ <b>{formatHours(asleep)}</b>
        </span>
        <span className={cx('font-black', ok ? 'text-move' : 'text-care')}>{efficiency != null ? `${efficiency} %` : '—'}</span>
      </div>
      {efficiency != null && (
        <div className="relative mt-2 h-2.5 rounded-full bg-line">
          <div className={cx('h-full rounded-full transition-all', ok ? 'bg-move' : 'bg-care')} style={{ width: `${efficiency}%` }} />
          <div className="absolute -top-1 h-4.5 w-0.5 bg-ink/50" style={{ left: `${goal}%` }} title={`Meta ${goal} %`} />
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-muted">Eficiencia del sueño = horas dormidas / horas en cama. Debe tender a 100 % (meta {goal} %).</p>
    </div>
  )
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 py-1', className)}>
      <span className="text-sm font-bold">{label}</span>
      {children}
    </div>
  )
}

/* ───────────── Ánimo ───────────── */

export function MoodCard({ entry, update, done }: P & { done: boolean }) {
  return (
    <Card area="mood" emoji="😊" title="Ánimo, energía y estrés" subtitle={entry.mood != null ? `Ánimo ${entry.mood} · Energía ${entry.energy ?? '–'} · Estrés ${entry.stress ?? '–'}` : '¿Cómo te sientes hoy?'} done={done}>
      <div className="space-y-4">
        <Scale10 label="Ánimo" value={entry.mood} onChange={(v) => update((d) => ({ ...d, mood: v }))} low="Muy bajo" high="Excelente" />
        <Scale10 label="Energía" value={entry.energy} onChange={(v) => update((d) => ({ ...d, energy: v }))} area="care" low="Agotad@" high="Con toda la energía" />
        <Scale10 label="Estrés" value={entry.stress} onChange={(v) => update((d) => ({ ...d, stress: v }))} area="coral" reverse low="Tranquil@" high="Muy estresad@" />
      </div>
    </Card>
  )
}

/* ───────────── Agua ───────────── */

export function WaterCard({ entry, update, goals, done }: P & { goals: Goals; done: boolean }) {
  return (
    <Card area="water" emoji="💧" title="Agua" subtitle={`${entry.water} de ${goals.waterGlasses} vasos`} done={done}>
      <WaterGlasses value={entry.water} goal={goals.waterGlasses} onChange={(v) => update((d) => ({ ...d, water: v }))} />
      <p className="mt-2 text-xs text-muted">Toca un vaso para marcar hasta ahí. Toca el último lleno para restar uno.</p>
    </Card>
  )
}

/* ───────────── Comidas ───────────── */

export function MealsCard({ entry, update, done }: P & { done: boolean }) {
  const [tab, setTab] = useState<MealType>(defaultMealTab())
  const meal = entry.meals.find((m) => m.type === tab)
  const setMeal = (patch: Partial<Meal>) =>
    update((d) => {
      const cur = d.meals.find((m) => m.type === tab)
      const next: Meal = { ...(cur ?? { id: uid(), type: tab, groups: [], description: '' }), ...patch }
      const meals = cur ? d.meals.map((m) => (m.type === tab ? next : m)) : [...d.meals, next]
      return { ...d, meals: meals.filter((m) => m.groups.length > 0 || m.description.trim() !== '') }
    })
  const toggle = (g: FoodGroup) => {
    const groups = meal?.groups ?? []
    setMeal({ groups: groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g] })
  }
  const summary = MEAL_TYPES.map((t) => {
    const m = entry.meals.find((x) => x.type === t.value)
    return m ? `${t.label[0]}:${m.groups.map((g) => FOOD_GROUPS.find((f) => f.value === g)!.short).join('') || '✓'}` : null
  })
    .filter(Boolean)
    .join('  ')

  return (
    <Card area="food" emoji="🍽️" title="Comidas" subtitle={summary || 'Toca los grupos de alimentos de cada comida'} done={done}>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
        {MEAL_TYPES.map((t) => {
          const filled = entry.meals.some((m) => m.type === t.value)
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cx('relative rounded-xl py-1.5 text-xs font-bold transition', tab === t.value ? 'bg-food text-white shadow-sm' : 'text-muted')}
            >
              {t.label}
              {filled && <span className={cx('absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full', tab === t.value ? 'bg-white' : 'bg-food')} />}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {FOOD_GROUPS.map((g) => (
          <Chip key={g.value} area="food" active={!!meal?.groups.includes(g.value)} onClick={() => toggle(g.value)}>
            <span>{g.emoji}</span> {g.label}
          </Chip>
        ))}
      </div>
      <input
        className="field mt-3 text-sm"
        placeholder="¿Qué comiste? (opcional, ej. huevo, pan)"
        value={meal?.description ?? ''}
        onChange={(e) => setMeal({ description: e.target.value })}
      />
    </Card>
  )
}

function defaultMealTab(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'desayuno'
  if (h < 16) return 'almuerzo'
  if (h < 19) return 'snack'
  return 'cena'
}

/* ───────────── Ejercicio ───────────── */

export function ExerciseCard({ entry, update, done }: P & { done: boolean }) {
  const total = entry.exercise.reduce((a, x) => a + x.minutes, 0)
  const add = (type: ExerciseType) =>
    update((d) => ({ ...d, exercise: [...d.exercise, { id: uid(), type, minutes: 30, intensity: 'media' }] }))
  const patch = (id: string, p: Partial<DayEntry['exercise'][number]>) =>
    update((d) => ({ ...d, exercise: d.exercise.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const remove = (id: string) => update((d) => ({ ...d, exercise: d.exercise.filter((x) => x.id !== id) }))

  return (
    <Card area="move" emoji="🏃" title="Ejercicio" subtitle={total ? `${total} min en ${entry.exercise.length} sesión(es)` : 'Toca un tipo para agregar una sesión'} done={done}>
      <div className="space-y-2">
        {entry.exercise.map((x) => {
          const t = EXERCISE_TYPES.find((t) => t.value === x.type)!
          return (
            <div key={x.id} className="rounded-2xl border border-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">{t.emoji}</span>
                <select className="field w-auto py-1 text-sm font-bold" value={x.type} onChange={(e) => patch(x.id, { type: e.target.value as ExerciseType })}>
                  {EXERCISE_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="ml-auto px-2 text-xl text-muted hover:text-coral" onClick={() => remove(x.id)} aria-label="Eliminar sesión">
                  ×
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Stepper value={x.minutes} onChange={(v) => patch(x.id, { minutes: v ?? 0 })} step={5} max={600} unit="min" area="move" label="minutos" />
                <div className="min-w-44 flex-1">
                  <Segmented area="move" value={x.intensity} onChange={(v) => v && patch(x.id, { intensity: v })} options={INTENSITIES} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className={cx('flex flex-wrap gap-2', entry.exercise.length > 0 && 'mt-3')}>
        {EXERCISE_TYPES.map((t) => (
          <button key={t.value} type="button" onClick={() => add(t.value)} className="rounded-full border-2 border-dashed border-move/50 px-3 py-1.5 text-sm font-bold text-move hover:bg-move/10">
            + {t.emoji} {t.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ───────────── Cuidados personales ───────────── */

export function CareCard({ entry, update, habits, done }: P & { habits: Habit[]; done: boolean }) {
  const active = habits.filter((h) => h.active || entry.habitIds.includes(h.id))
  const toggle = (id: string) =>
    update((d) => ({ ...d, habitIds: d.habitIds.includes(id) ? d.habitIds.filter((x) => x !== id) : [...d.habitIds, id] }))
  return (
    <Card area="care" emoji="✨" title="Cuidados personales" subtitle={entry.habitIds.length ? `${entry.habitIds.length} hábito(s)` : '¿Qué hiciste por ti hoy?'} done={done}>
      {active.length === 0 ? (
        <Empty>
          No tienes hábitos activos. <Link to="/ajustes" className="font-bold text-care">Agrégalos en Ajustes</Link>.
        </Empty>
      ) : (
        <div className="flex flex-wrap gap-2">
          {active.map((h) => (
            <Chip key={h.id} area="care" active={entry.habitIds.includes(h.id)} onClick={() => toggle(h.id)}>
              {h.emoji} {h.name}
            </Chip>
          ))}
        </div>
      )}
      <Link to="/ajustes" className="mt-3 inline-block text-xs font-bold text-care">
        Editar lista →
      </Link>
    </Card>
  )
}

/* ───────────── Cafeína y alcohol ───────────── */

function IntakeList({ entry, update, kind, unit, emoji, area }: P & { kind: IntakeKind; unit: string; emoji: string; area: 'intake' | 'cycle' }) {
  const items = entry.intakes.filter((i) => i.kind === kind)
  const patch = (id: string, p: Partial<Intake>) => update((d) => ({ ...d, intakes: d.intakes.map((i) => (i.id === id ? { ...i, ...p } : i)) }))
  const remove = (id: string) => update((d) => ({ ...d, intakes: d.intakes.filter((i) => i.id !== id) }))
  const add = () => update((d) => ({ ...d, intakes: [...d.intakes, { id: uid(), kind, medicationId: null, amount: 1, time: nowHHMM() }] }))
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <Stepper value={i.amount} onChange={(v) => patch(i.id, { amount: v ?? 0 })} min={0} max={20} unit={unit} area={area} label={unit} />
          <input type="time" aria-label="Hora" className="field w-28 py-1 text-center text-sm font-bold" value={i.time ?? ''} onChange={(e) => patch(i.id, { time: e.target.value || null })} />
          <button type="button" className="ml-auto px-2 text-xl text-muted hover:text-coral" onClick={() => remove(i.id)} aria-label="Eliminar">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-full border-2 border-dashed border-intake/50 px-3 py-1.5 text-sm font-bold text-intake hover:bg-intake/10">
        + {emoji} Agregar ({unit})
      </button>
    </div>
  )
}

export function IntakeCard({ entry, update, done }: P & { done: boolean }) {
  const sum = (k: IntakeKind) => entry.intakes.filter((i) => i.kind === k).reduce((a, i) => a + i.amount, 0)
  const c = sum('cafeina')
  const a = sum('alcohol')
  return (
    <Card area="intake" emoji="☕" title="Cafeína y alcohol" subtitle={c || a ? `${c} taza(s) · ${a} trago(s)` : 'Afectan tu sueño: registra cantidad y hora'} done={done} defaultOpen={false}>
      <h4 className="mb-2 text-sm font-extrabold">Cafeína <span className="font-normal text-muted">(café, té, bebidas energéticas)</span></h4>
      <IntakeList entry={entry} update={update} kind="cafeina" unit="tazas" emoji="☕" area="intake" />
      <h4 className="mt-4 mb-2 text-sm font-extrabold">Alcohol</h4>
      <IntakeList entry={entry} update={update} kind="alcohol" unit="tragos" emoji="🍷" area="intake" />
    </Card>
  )
}

/* ───────────── Medicamentos ───────────── */

export function MedsCard({ entry, update, meds }: P & { meds: Medication[] }) {
  const active = meds.filter((m) => m.active)
  const taken = (id: string) => entry.intakes.find((i) => i.kind === 'medicamento' && i.medicationId === id)
  const toggle = (m: Medication) =>
    update((d) => {
      const t = d.intakes.find((i) => i.kind === 'medicamento' && i.medicationId === m.id)
      return t
        ? { ...d, intakes: d.intakes.filter((i) => i !== t) }
        : { ...d, intakes: [...d.intakes, { id: uid(), kind: 'medicamento', medicationId: m.id, amount: 1, time: nowHHMM() }] }
    })
  const setTime = (id: string, time: string | null) =>
    update((d) => ({ ...d, intakes: d.intakes.map((i) => (i.id === id ? { ...i, time } : i)) }))
  const count = active.filter((m) => taken(m.id)).length
  return (
    <Card area="meds" emoji="💊" title="Medicamentos y suplementos" subtitle={active.length ? `${count} de ${active.length} tomados` : 'Sin medicamentos configurados'} defaultOpen={false}>
      {active.length === 0 ? (
        <Empty>
          <Link to="/ajustes" className="font-bold text-meds">Agrega tus medicamentos o suplementos en Ajustes</Link>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {active.map((m) => {
            const t = taken(m.id)
            return (
              <li key={m.id} className="flex items-center gap-2">
                <Chip area="meds" active={!!t} onClick={() => toggle(m)}>
                  {t ? '✓' : '○'} {m.name} {m.dose && <span className="font-normal opacity-80">{m.dose}</span>}
                </Chip>
                {m.sleepAid && <span className="text-xs">🌙</span>}
                {t && (
                  <input type="time" aria-label={`Hora ${m.name}`} className="field ml-auto w-28 py-1 text-center text-sm font-bold" value={t.time ?? ''} onChange={(e) => setTime(t.id, e.target.value || null)} />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ───────────── Peso y ciclo ───────────── */

export function BodyCard({ entry, update, done }: P & { done: boolean }) {
  return (
    <Card area="body" emoji="⚖️" title="Peso y medidas" subtitle={entry.weightKg != null ? `${fmtNum(entry.weightKg)} kg` : 'Opcional, por ejemplo 1 vez a la semana'} done={done} defaultOpen={false}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Peso" unit="kg" step={0.1} value={entry.weightKg} onChange={(v) => update((d) => ({ ...d, weightKg: v }))} />
        <NumberField label="Cintura" unit="cm" step={0.5} value={entry.waistCm} onChange={(v) => update((d) => ({ ...d, waistCm: v }))} />
      </div>
    </Card>
  )
}

const FLOWS: { value: CycleFlow; label: string }[] = [
  { value: 'leve', label: 'Leve' },
  { value: 'medio', label: 'Medio' },
  { value: 'abundante', label: 'Abundante' },
]

export function CycleCard({ entry, update, done }: P & { done: boolean }) {
  const toggleSym = (s: string) =>
    update((d) => ({ ...d, cycleSymptoms: d.cycleSymptoms.includes(s) ? d.cycleSymptoms.filter((x) => x !== s) : [...d.cycleSymptoms, s] }))
  return (
    <Card area="cycle" emoji="🌸" title="Ciclo" subtitle={entry.cyclePeriod ? 'Con período' : entry.cyclePeriod === false ? 'Sin período' : '¿Estás con tu período?'} done={done} defaultOpen={false}>
      <Segmented
        area="cycle"
        allowClear
        value={entry.cyclePeriod == null ? null : entry.cyclePeriod ? 'si' : 'no'}
        onChange={(v) => update((d) => ({ ...d, cyclePeriod: v == null ? null : v === 'si', cycleFlow: v === 'si' ? d.cycleFlow : null }))}
        options={[
          { value: 'si', label: 'Sí, con período' },
          { value: 'no', label: 'No' },
        ]}
      />
      {entry.cyclePeriod && (
        <div className="mt-3">
          <span className="mb-1 block text-xs font-bold text-muted">Flujo</span>
          <Segmented area="cycle" allowClear value={entry.cycleFlow} onChange={(v) => update((d) => ({ ...d, cycleFlow: v }))} options={FLOWS} />
        </div>
      )}
      <span className="mt-3 mb-1 block text-xs font-bold text-muted">Síntomas</span>
      <div className="flex flex-wrap gap-1.5">
        {CYCLE_SYMPTOMS.map((s) => (
          <Chip key={s} size="sm" area="cycle" active={entry.cycleSymptoms.includes(s)} onClick={() => toggleSym(s)}>
            {s}
          </Chip>
        ))}
      </div>
    </Card>
  )
}

/* ───────────── Nota ───────────── */

export function NoteCard({ entry, update }: P) {
  return (
    <Card area="coral" emoji="📝" title="Nota del día" subtitle={entry.note || 'Algo que quieras recordar'} defaultOpen={false}>
      <textarea
        className="field min-h-24 text-sm"
        placeholder="¿Pasó algo especial? ¿Síntomas, logros, situaciones?"
        value={entry.note}
        onChange={(e) => update((d) => ({ ...d, note: e.target.value }))}
      />
    </Card>
  )
}
