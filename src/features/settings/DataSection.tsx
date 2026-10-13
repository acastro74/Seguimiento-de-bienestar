import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useRepo } from '@/data/RepoProvider'
import { buildBackup, parseBackup, planImport, type Backup } from '@/lib/backup'
import { downloadFile } from '@/lib/csv'
import { todayISO } from '@/lib/dates'

/** Respaldo: descargar todo en JSON o importarlo (por ejemplo, del modo demo a la cuenta en la nube). */
export function DataSection() {
  const repo = useRepo()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const exportBackup = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const [profile, habits, meds, days] = await Promise.all([
        repo.getProfile(),
        repo.listHabits(),
        repo.listMedications(),
        repo.listDays('2000-01-01', todayISO()),
      ])
      downloadFile(`bitacora_respaldo_${todayISO()}.json`, JSON.stringify(buildBackup(profile, habits, meds, days), null, 2), 'application/json')
      setMsg({ ok: true, text: `Respaldo descargado: ${days.length} días.` })
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo crear el respaldo: ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  const importBackup = async (file: File) => {
    setMsg(null)
    let backup: Backup
    try {
      backup = parseBackup(await file.text())
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
      return
    }
    setBusy(true)
    try {
      const [habits, meds, existing] = await Promise.all([repo.listHabits(), repo.listMedications(), repo.listDays('2000-01-01', '2999-12-31')])
      const plan = planImport(backup, habits, meds)
      const existingDates = new Set(existing.map((d) => d.date))
      const overlap = plan.days.filter((d) => existingDates.has(d.date)).length
      const lines = [
        `Se importarán ${plan.days.length} días`,
        plan.newHabits.length ? `${plan.newHabits.length} hábitos nuevos` : '',
        plan.newMeds.length ? `${plan.newMeds.length} medicamentos nuevos` : '',
      ].filter(Boolean)
      const warn = overlap ? `\n\n⚠️ ${overlap} de esos días ya tienen registro aquí y se reemplazarán por los del respaldo.` : ''
      if (!confirm(`${lines.join(', ')}.${warn}\n\n¿Continuar?`)) return
      for (const h of plan.newHabits) await repo.saveHabit(h)
      for (const m of plan.newMeds) await repo.saveMedication(m)
      await repo.saveDays(plan.days)
      await qc.invalidateQueries()
      setMsg({ ok: true, text: `Listo: se importaron ${plan.days.length} días.` })
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo importar: ${(e as Error).message}` })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Descarga un <b>respaldo</b> con todos tus registros para guardarlo o pasarlo a otra cuenta o dispositivo. Para tu consulta usa
        los <Link to="/reportes" className="font-bold text-sleep">Reportes</Link> (PDF o CSV).
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={exportBackup} disabled={busy}>
          ⬇️ Descargar respaldo
        </button>
        <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          ⬆️ Importar respaldo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Archivo de respaldo"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importBackup(f)
          }}
        />
      </div>
      {msg && <p className={msg.ok ? 'font-bold text-move' : 'font-bold text-coral'}>{msg.text}</p>}
    </div>
  )
}
