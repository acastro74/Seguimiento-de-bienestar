import { useState } from 'react'
import type { Goals, Habit, Medication } from '@/data/types'
import { Stepper, cx } from '@/components/ui'

export function GoalsEditor({ goals, onChange }: { goals: Goals; onChange: (g: Goals) => void }) {
  const set = <K extends keyof Goals>(k: K, v: number | null) => onChange({ ...goals, [k]: v ?? 0 })
  const rows: { k: keyof Goals; label: string; emoji: string; unit: string; step: number; max: number; area: 'water' | 'sleep' | 'move' | 'food' }[] = [
    { k: 'waterGlasses', label: 'Agua al día', emoji: '💧', unit: 'vasos', step: 1, max: 20, area: 'water' },
    { k: 'sleepHours', label: 'Horas de sueño', emoji: '🌙', unit: 'h', step: 0.5, max: 12, area: 'sleep' },
    { k: 'sleepEfficiency', label: 'Eficiencia del sueño', emoji: '🛏️', unit: '%', step: 5, max: 100, area: 'sleep' },
    { k: 'exerciseMinWeek', label: 'Ejercicio a la semana', emoji: '🏃', unit: 'min', step: 15, max: 1000, area: 'move' },
    { k: 'vegMealsDay', label: 'Comidas con vegetales al día', emoji: '🥦', unit: '', step: 1, max: 5, area: 'food' },
  ]
  return (
    <div className="divide-y divide-line">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-sm font-bold">
            <span className="mr-1.5">{r.emoji}</span>
            {r.label}
          </span>
          <Stepper value={goals[r.k]} onChange={(v) => set(r.k, v)} step={r.step} max={r.max} unit={r.unit} area={r.area} label={r.label} />
        </div>
      ))}
    </div>
  )
}

const EMOJIS = ['✨', '🧘', '📖', '🌤️', '📵', '🧴', '💬', '🫂', '🤸', '🛁', '🎵', '🙏', '✍️', '🐶', '🌱', '💆']

export function HabitListEditor({
  habits,
  onAdd,
  onToggle,
  onDelete,
}: {
  habits: Habit[]
  onAdd: (name: string, emoji: string) => void
  onToggle: (h: Habit) => void
  onDelete: (h: Habit) => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [pick, setPick] = useState(false)
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), emoji)
    setName('')
  }
  return (
    <div>
      <p className="mb-2 text-xs text-muted">Toca para activar/desactivar. Los activos aparecen en tu registro diario.</p>
      <div className="flex flex-wrap gap-2">
        {habits.map((h) => (
          <span
            key={h.id}
            className={cx(
              'inline-flex items-center gap-1 rounded-full border-2 py-1 pr-1 pl-3 text-sm font-bold',
              h.active ? 'border-care bg-care/12' : 'border-line text-muted line-through',
            )}
          >
            <button type="button" onClick={() => onToggle(h)} aria-pressed={h.active}>
              {h.emoji} {h.name}
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${h.name}`}
              onClick={() => onDelete(h)}
              className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-line"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <div className="relative">
          <button type="button" className="field h-full w-12 px-0 text-lg" onClick={() => setPick((p) => !p)} aria-label="Elegir emoji">
            {emoji}
          </button>
          {pick && (
            <div className="absolute top-12 left-0 z-10 grid w-56 grid-cols-8 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-lg">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-lg p-1 text-lg hover:bg-surface-2"
                  onClick={() => {
                    setEmoji(e)
                    setPick(false)
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <input className="field" placeholder="Nuevo hábito (ej. Yoga facial)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary shrink-0 bg-care">Agregar</button>
      </form>
    </div>
  )
}

export function MedListEditor({
  meds,
  onAdd,
  onDelete,
}: {
  meds: Medication[]
  onAdd: (m: Omit<Medication, 'id'>) => void
  onDelete: (m: Medication) => void
}) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [sleepAid, setSleepAid] = useState(false)
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), dose: dose.trim(), sleepAid, active: true })
    setName('')
    setDose('')
    setSleepAid(false)
  }
  return (
    <div>
      {meds.length > 0 && (
        <ul className="mb-3 divide-y divide-line rounded-2xl border border-line">
          {meds.map((m) => (
            <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span>💊</span>
              <span className="font-bold">{m.name}</span>
              {m.dose && <span className="text-muted">{m.dose}</span>}
              {m.sleepAid && <span className="rounded-full bg-sleep/15 px-2 text-[11px] font-bold text-sleep">para dormir</span>}
              <button type="button" className="ml-auto text-muted hover:text-coral" onClick={() => onDelete(m)} aria-label={`Eliminar ${m.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid grid-cols-[1fr_6rem] gap-2">
        <input className="field" placeholder="Medicamento o suplemento" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="Dosis" value={dose} onChange={(e) => setDose(e.target.value)} />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sleepAid} onChange={(e) => setSleepAid(e.target.checked)} className="h-4 w-4 accent-sleep" />
          Lo tomo para ayudarme a dormir
        </label>
        <button className="btn-primary col-span-2 bg-meds">Agregar</button>
      </form>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-move' : 'bg-line')}
      >
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </label>
  )
}

