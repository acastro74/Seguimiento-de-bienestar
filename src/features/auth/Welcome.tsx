import { useQueryClient } from '@tanstack/react-query'
import { localRepo } from '@/data/RepoProvider'
import { buildDemo } from '@/data/demo'
import { emptyProfile } from '@/data/defaults'
import { todayISO } from '@/lib/dates'
import { AuthLayout } from './Login'

/** Pantalla inicial del modo demo (sin Supabase configurado). */
export function Welcome() {
  const qc = useQueryClient()

  const loadDemo = () => {
    localRepo.replaceAll(buildDemo(todayISO()))
    qc.invalidateQueries()
  }
  const startEmpty = async () => {
    await localRepo.saveProfile(emptyProfile())
    qc.invalidateQueries()
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-black">¡Hola! 👋</h2>
      <p className="mt-1 text-sm text-muted">
        Estás en <b>modo demo</b>: los datos se guardan solo en este navegador. Para tener cuentas y sincronizar
        entre dispositivos, configura Supabase (ver README).
      </p>
      <div className="mt-5 space-y-2">
        <button className="btn-primary w-full" onClick={loadDemo}>
          ✨ Explorar con 60 días de ejemplo
        </button>
        <button className="btn-ghost w-full" onClick={startEmpty}>
          Empezar mi bitácora desde cero
        </button>
      </div>
    </AuthLayout>
  )
}
