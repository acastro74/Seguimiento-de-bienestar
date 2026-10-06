import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Repo } from './repo'
import { LocalRepo } from './localRepo'
import { SupabaseRepo } from './supabaseRepo'

interface Ctx {
  /** null mientras no hay sesión (modo nube) */
  repo: Repo | null
  loading: boolean
  email: string | null
  signOut: () => Promise<void>
}

const RepoContext = createContext<Ctx | null>(null)

export const localRepo = new LocalRepo()

export function RepoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  const value = useMemo<Ctx>(() => {
    if (!supabase) {
      return {
        repo: localRepo,
        loading: false,
        email: null,
        signOut: async () => {
          localRepo.reset()
          qc.clear()
        },
      }
    }
    return {
      repo: session ? new SupabaseRepo(supabase, session.user.id) : null,
      loading,
      email: session?.user.email ?? null,
      signOut: async () => {
        await supabase!.auth.signOut()
      },
    }
  }, [session, loading, qc])

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
