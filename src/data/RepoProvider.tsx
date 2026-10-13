import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Repo } from './repo'
import { DEMO_STORAGE_KEY, LocalRepo } from './localRepo'
import { SupabaseRepo } from './supabaseRepo'

interface Ctx {
  /** null mientras no hay sesión (modo nube) */
  repo: Repo | null
  loading: boolean
  email: string | null
  /** La persona llegó desde el enlace de "olvidé mi contraseña" y debe elegir una nueva */
  recovering: boolean
  finishRecovery: () => void
  signOut: () => Promise<void>
}

const RepoContext = createContext<Ctx | null>(null)

export const localRepo = new LocalRepo()

export function RepoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession((prev) => {
        // Limpiar la caché solo si cambia la persona (no en cada refresco del token)
        if (prev?.user.id !== s?.user.id) qc.clear()
        return s
      })
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  // Modo demo: si otra pestaña guarda datos, refrescar esta
  useEffect(() => {
    if (supabase) return
    navigator.storage?.persist?.().catch(() => {})
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_STORAGE_KEY || e.key === null) qc.invalidateQueries()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [qc])

  const userId = session?.user.id ?? null
  const email = session?.user.email ?? null

  const value = useMemo<Ctx>(() => {
    if (!supabase) {
      return {
        repo: localRepo,
        loading: false,
        email: null,
        recovering: false,
        finishRecovery: () => {},
        signOut: async () => {
          localRepo.reset()
          // resetQueries (no clear) para que las pantallas abiertas vuelvan a leer y la app regrese a la bienvenida
          await qc.resetQueries()
        },
      }
    }
    return {
      repo: userId ? new SupabaseRepo(supabase, userId) : null,
      loading,
      email,
      recovering,
      finishRecovery: () => setRecovering(false),
      signOut: async () => {
        await supabase!.auth.signOut()
      },
    }
  }, [userId, email, loading, recovering, qc])

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>
}

export function useRepoCtx() {
  const c = useContext(RepoContext)
  if (!c) throw new Error('RepoProvider faltante')
  return c
}

/** Repo garantizado (usar solo dentro de rutas autenticadas). */
export function useRepo(): Repo {
  const { repo } = useRepoCtx()
  if (!repo) throw new Error('Sin sesión')
  return repo
}
