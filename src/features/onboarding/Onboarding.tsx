import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Habit, Medication, Profile } from '@/data/types'
import { DEFAULT_HABITS, emptyProfile, uid } from '@/data/defaults'
import { useRepo } from '@/data/RepoProvider'
import { useHabits, useMedications, useProfile } from '@/data/hooks'
import { AuthLayout } from '@/features/auth/Login'
import { cx } from '@/components/ui'
import { GoalsEditor, HabitListEditor, MedListEditor, Toggle } from '@/features/settings/editors'

const STEPS = ['Tú', 'Metas', 'Hábitos']

export function Onboarding() {
  const repo = useRepo()
  const qc = useQueryClient()
  const existing = useProfile().data
  const existingHabits = useHabits().data
  const existingMeds = useMedications().data
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>(existing ?? emptyProfile())
  const [habits, setHabits] = useState<Habit[] | null>(null)
  const [meds, setMeds] = useState<Medication[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [defaults] = useState<Habit[]>(() => DEFAULT_HABITS.map((h) => ({ ...h, id: uid() })))
  const habitList = habits ?? (existingHabits?.length ? existingHabits : defaults)

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!existingHabits?.length) for (const h of habitList) await repo.saveHabit(h)
      else if (habits) for (const h of habits) await repo.saveHabit(h)
      for (const m of meds) await repo.saveMedication(m)
      await repo.saveProfile({ ...profile, onboarded: true })
      await qc.invalidateQueries()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-5 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={cx('h-1.5 rounded-full', i <= step ? 'bg-sleep' : 'bg-line')} />
            <span className={cx('mt-1 block text-[11px] font-bold', i === step ? 'text-sleep' : 'text-muted')}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black">¿Cómo te llamas?</h2>
            <input
              className="field mt-2"
              autoFocus
              placeholder="Tu nombre"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div className="divide-y divide-line rounded-2xl border border-line px-3">
            <Toggle
              label="⚖️ Registrar peso y medidas"
              hint="Opcional, por ejemplo una vez a la semana"
              checked={profile.trackWeight}
              onChange={(v) => setProfile({ ...profile, trackWeight: v })}
            />
            <Toggle
              label="🌸 Registrar ciclo menstrual"
              hint="Para ver cómo se relaciona con tu ánimo y energía"
              checked={profile.trackCycle}
              onChange={(v) => setProfile({ ...profile, trackCycle: v })}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-xl font-black">Tus metas</h2>
          <p className="mb-2 text-sm text-muted">El dashboard te mostrará qué tan cerca estás. Puedes cambiarlas cuando quieras.</p>
          <GoalsEditor goals={profile.goals} onChange={(goals) => setProfile({ ...profile, goals })} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-black">Cuidados personales</h2>
            <HabitListEditor
              habits={habitList}
              onAdd={(name, emoji) => setHabits([...habitList, { id: uid(), name, emoji, active: true, sort: habitList.length }])}
              onToggle={(h) => setHabits(habitList.map((x) => (x.id === h.id ? { ...x, active: !x.active } : x)))}
              onDelete={(h) => setHabits(habitList.filter((x) => x.id !== h.id))}
            />
          </div>
          <div>
            <h2 className="text-lg font-black">Medicamentos y suplementos</h2>
            <p className="mb-2 text-xs text-muted">Opcional. Podrás marcarlos cada día con la hora en que los tomaste.</p>
            <MedListEditor
              meds={[...(existingMeds ?? []), ...meds]}
              onAdd={(m) => setMeds([...meds, { ...m, id: uid() }])}
              onDelete={(m) => setMeds(meds.filter((x) => x.id !== m.id))}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-bold text-coral">{error}</p>}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button className="btn-ghost" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn-primary ml-auto" disabled={step === 0 && !profile.name.trim()} onClick={() => setStep(step + 1)}>
            Siguiente
          </button>
        ) : (
          <button className="btn-primary ml-auto" disabled={busy} onClick={finish}>
            {busy ? 'Guardando…' : '¡Empezar! 🎉'}
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
