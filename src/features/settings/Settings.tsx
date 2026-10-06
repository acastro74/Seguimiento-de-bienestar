import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Profile } from '@/data/types'
import { uid } from '@/data/defaults'
import { localRepo, useRepoCtx } from '@/data/RepoProvider'
import { useCatalogMutations, useHabits, useMedications, useProfileOrDefault, useSaveProfile } from '@/data/hooks'
import { buildDemo } from '@/data/demo'
import { Segmented } from '@/components/ui'
import { applyTheme, getTheme, type Theme } from '@/lib/theme'
import { todayISO } from '@/lib/dates'
import { GoalsEditor, HabitListEditor, MedListEditor, Toggle } from './editors'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4">
      <h2 className="mb-2 text-[15px] font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

export function Settings() {
  const saved = useProfileOrDefault()
  const save = useSaveProfile()
  const [profile, setProfile] = useState<Profile>(saved)
  const habits = useHabits().data ?? []
  const meds = useMedications().data ?? []
  const { saveHabit, deleteHabit, saveMed, deleteMed } = useCatalogMutations()
  const { repo, email, signOut } = useRepoCtx()
  const qc = useQueryClient()
  const [theme, setTheme] = useState<Theme>(getTheme())

  // Guardado automático del perfil (con pequeño retraso)
  useEffect(() => {
    if (JSON.stringify(profile) === JSON.stringify(saved)) return
    const t = setTimeout(() => save.mutate(profile), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-black">Ajustes</h1>

      <Section title="👤 Perfil">
        <label className="mb-2 block">
          <span className="mb-1 block text-xs font-bold text-muted">Nombre</span>
          <input className="field" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </label>
        <div className="divide-y divide-line">
          <Toggle label="⚖️ Registrar peso y medidas" checked={profile.trackWeight} onChange={(v) => setProfile({ ...profile, trackWeight: v })} />
          <Toggle label="🌸 Registrar ciclo menstrual" checked={profile.trackCycle} onChange={(v) => setProfile({ ...profile, trackCycle: v })} />
        </div>
      </Section>

      <Section title="🎯 Metas">
        <GoalsEditor goals={profile.goals} onChange={(goals) => setProfile({ ...profile, goals })} />
      </Section>

      <Section title="✨ Cuidados personales">
        <HabitListEditor
          habits={habits}
          onAdd={(name, emoji) => saveHabit.mutate({ id: uid(), name, emoji, active: true, sort: habits.length })}
          onToggle={(h) => saveHabit.mutate({ ...h, active: !h.active })}
          onDelete={(h) => {
            if (confirm(`¿Eliminar «${h.name}»? Si solo quieres dejar de verlo, tócalo para desactivarlo y conservar su historial.`)) deleteHabit.mutate(h.id)
          }}
        />
      </Section>

      <Section title="💊 Medicamentos y suplementos">
        <MedListEditor
          meds={meds}
          onAdd={(m) => saveMed.mutate({ ...m, id: uid() })}
          onDelete={(m) => {
            if (confirm(`¿Eliminar «${m.name}»?`)) deleteMed.mutate(m.id)
          }}
        />
      </Section>

      <Section title="🎨 Apariencia">
        <Segmented<Theme>
          value={theme}
          onChange={(v) => {
            if (!v) return
            setTheme(v)
            applyTheme(v)
          }}
          options={[
            { value: 'system', label: 'Automático' },
            { value: 'light', label: '☀️ Claro' },
            { value: 'dark', label: '🌙 Oscuro' },
          ]}
        />
      </Section>

      <Section title="📤 Tus datos">
        <p className="mb-3 text-sm text-muted">Exporta tus registros en PDF (para tu consulta) o CSV (para Excel).</p>
        <Link to="/reportes" className="btn-ghost">
          Ir a Reportes →
        </Link>
      </Section>

      <Section title="🔐 Cuenta">
        {repo?.mode === 'demo' ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted">
              Estás en <b>modo demo</b>: los datos se guardan solo en este navegador.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                onClick={() => {
                  if (!confirm('Esto reemplaza tus datos actuales por 60 días de ejemplo. ¿Continuar?')) return
                  localRepo.replaceAll(buildDemo(todayISO()))
                  qc.invalidateQueries()
                }}
              >
                Cargar datos de ejemplo
              </button>
              <button
                className="btn-ghost text-coral"
                onClick={() => {
                  if (confirm('¿Borrar todos los datos de este navegador?')) void signOut()
                }}
              >
                Borrar todo y empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted">{email}</span>
            <button className="btn-ghost" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
