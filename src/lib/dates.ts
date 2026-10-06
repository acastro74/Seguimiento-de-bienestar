import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ISODate } from '@/data/types'

export const toISO = (d: Date): ISODate => format(d, 'yyyy-MM-dd')
export const fromISO = (s: ISODate): Date => parseISO(s)
export const todayISO = (): ISODate => toISO(new Date())
export const shiftISO = (s: ISODate, days: number): ISODate => toISO(addDays(fromISO(s), days))
export const diffDays = (a: ISODate, b: ISODate) => differenceInCalendarDays(fromISO(a), fromISO(b))

/** Fechas desde `from` hasta `to`, ambas incluidas. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = shiftISO(d, 1)) out.push(d)
  return out
}

export const fmt = (s: ISODate, pattern: string) => format(fromISO(s), pattern, { locale: es })

export const nowHHMM = () => format(new Date(), 'HH:mm')
