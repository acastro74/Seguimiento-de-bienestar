import { useEffect, useState } from 'react'
import type { ISODate } from '@/data/types'
import { todayISO } from './dates'

/** Milisegundos hasta la próxima medianoche local (más 1 s de margen). */
export function msUntilMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
  return next.getTime() - now.getTime()
}

/**
 * Fecha de hoy que se actualiza sola: al pasar la medianoche, al volver a la
 * pestaña o app (que pudo quedar abierta días) y cada minuto como respaldo.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const refresh = () => setToday(todayISO())
    let midnight = setTimeout(function tick() {
      refresh()
      midnight = setTimeout(tick, msUntilMidnight())
    }, msUntilMidnight())
    const minute = setInterval(refresh, 60_000)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      clearTimeout(midnight)
      clearInterval(minute)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [])

  return today
}
