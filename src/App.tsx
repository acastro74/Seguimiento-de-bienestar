import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useRepoCtx } from '@/data/RepoProvider'
import { useProfile } from '@/data/hooks'
import { Spinner } from '@/components/ui'
import { Shell } from '@/components/Shell'
import { Login } from '@/features/auth/Login'
import { Welcome } from '@/features/auth/Welcome'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { Today } from '@/features/checkin/Today'
import { History } from '@/features/history/History'
import { Settings } from '@/features/settings/Settings'

const Dashboard = lazy(() => import('@/features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const Reports = lazy(() => import('@/features/reports/Reports').then((m) => ({ default: m.Reports })))

export default function App() {
  const { repo, loading } = useRepoCtx()
  if (loading) return <Spinner />
  if (!repo) return <Login />
  return <Gate />
}

function Gate() {
  const { repo } = useRepoCtx()
  const profile = useProfile()
  if (profile.isLoading) return <Spinner />
  if (profile.error)
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="font-bold text-coral">No se pudieron cargar tus datos.</p>
        <p className="mt-1 text-sm text-muted">{String((profile.error as Error).message)}</p>
        <button className="btn-primary mt-4" onClick={() => profile.refetch()}>
          Reintentar
        </button>
      </div>
    )
  if (!profile.data && repo?.mode === 'demo') return <Welcome />
  if (!profile.data?.onboarded) return <Onboarding />
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Today />} />
        <Route path="dashboard" element={<Suspense fallback={<Spinner />}><Dashboard /></Suspense>} />
        <Route path="historial" element={<History />} />
        <Route path="reportes" element={<Suspense fallback={<Spinner />}><Reports /></Suspense>} />
        <Route path="ajustes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
