import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DayEntry, Habit, ISODate, Medication, Profile } from './types'
import { emptyDay, emptyProfile } from './defaults'
import { useRepo } from './RepoProvider'

export const keys = {
  profile: ['profile'] as const,
  habits: ['habits'] as const,
  meds: ['medications'] as const,
  day: (d: ISODate) => ['day', d] as const,
  days: (from: ISODate, to: ISODate) => ['days', from, to] as const,
}

export function useProfile() {
  const repo = useRepo()
  return useQuery({ queryKey: keys.profile, queryFn: () => repo.getProfile() })
}

/** Perfil con valores por defecto (para pantallas que ya pasaron el onboarding). */
export function useProfileOrDefault(): Profile {
  return useProfile().data ?? emptyProfile()
}

export function useSaveProfile() {
  const repo = useRepo()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Profile) => repo.saveProfile(p),
    onMutate: (p) => qc.setQueryData(keys.profile, p),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.profile }),
  })
}

export function useHabits() {
  const repo = useRepo()
  return useQuery({ queryKey: keys.habits, queryFn: () => repo.listHabits() })
}

export function useMedications() {
  const repo = useRepo()
  return useQuery({ queryKey: keys.meds, queryFn: () => repo.listMedications() })
}

export function useCatalogMutations() {
  const repo = useRepo()
  const qc = useQueryClient()
  const inv = (k: readonly string[]) => () => qc.invalidateQueries({ queryKey: k })
  return {
    saveHabit: useMutation({ mutationFn: (h: Habit) => repo.saveHabit(h), onSettled: inv(keys.habits) }),
    deleteHabit: useMutation({ mutationFn: (id: string) => repo.deleteHabit(id), onSettled: inv(keys.habits) }),
    saveMed: useMutation({ mutationFn: (m: Medication) => repo.saveMedication(m), onSettled: inv(keys.meds) }),
    deleteMed: useMutation({ mutationFn: (id: string) => repo.deleteMedication(id), onSettled: inv(keys.meds) }),
  }
}

export function useDays(from: ISODate, to: ISODate) {
  const repo = useRepo()
  return useQuery({ queryKey: keys.days(from, to), queryFn: () => repo.listDays(from, to) })
}

export function usePreviousDay(date: ISODate) {
  const repo = useRepo()
  return useQuery({ queryKey: ['prev', date], queryFn: () => repo.previousDay(date) })
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Edición de un día con autoguardado: los cambios se aplican al instante en pantalla
 * y se guardan 600 ms después del último cambio.
 */
export function useDayEditor(date: ISODate) {
  const repo = useRepo()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: keys.day(date), queryFn: () => repo.getDay(date) })
  const [entry, setEntry] = useState<DayEntry | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<DayEntry | null>(null)

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const d = pending.current
    if (!d) return
    pending.current = null
    setStatus('saving')
    try {
      await repo.saveDay(d)
      qc.setQueryData(keys.day(d.date), d)
      qc.invalidateQueries({ queryKey: ['days'] })
      qc.invalidateQueries({ queryKey: ['prev'] })
      setStatus(pending.current ? 'saving' : 'saved')
    } catch (e) {
      console.error(e)
      pending.current = pending.current ?? d
      setStatus('error')
    }
  }, [repo, qc])

  // Al cambiar de fecha: guardar lo pendiente y cargar el nuevo día
  useEffect(() => {
    setEntry(null)
    setStatus('idle')
    return () => {
      void flush()
    }
  }, [date, flush])

  useEffect(() => {
    if (query.isSuccess && entry === null) setEntry(query.data ?? emptyDay(date))
  }, [query.isSuccess, query.data, entry, date])

  // Guardar al cerrar o esconder la pestaña
  useEffect(() => {
    const onHide = () => void flush()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  const update = useCallback(
    (fn: (d: DayEntry) => DayEntry) => {
      setEntry((cur) => {
        if (!cur) return cur
        const next = fn(cur)
        pending.current = next
        return next
      })
      setStatus('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 600)
    },
    [flush],
  )

  return { entry, update, status, retry: flush, loading: query.isLoading, error: query.error }
}
