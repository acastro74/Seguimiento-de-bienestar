import { useEffect, useState, type ReactNode } from 'react'
import { cx } from '@/components/ui'

/** Paletas validadas (contraste, daltonismo) para cada modo. */
const PALETTE = {
  light: {
    surface: '#ffffff',
    grid: '#ebe3dc',
    axis: '#7a7489',
    mood: '#7a5bd0',
    energy: '#eb6834',
    stress: '#2a78d6',
    exercise: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
    single: '#7d70d0',
    water: '#2a78d6',
    food: '#d55181',
    care: '#eb6834',
    goal: '#2b2838',
  },
  dark: {
    surface: '#201d2a',
    grid: '#353042',
    axis: '#a49db4',
    mood: '#9085e9',
    energy: '#d95926',
    stress: '#3987e5',
    exercise: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
    single: '#9085e9',
    water: '#3987e5',
    food: '#d55181',
    care: '#d95926',
    goal: '#f1edf7',
  },
}

export type ChartColors = (typeof PALETTE)['light']

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function useChartColors(): ChartColors {
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark ? PALETTE.dark : PALETTE.light
}

export function ChartCard({ title, subtitle, children, className, right }: { title: string; subtitle?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cx('rounded-3xl border border-line bg-surface p-4', className)}>
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}

interface TipPayload {
  name?: string | number
  value?: number | string | null
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

/** Tooltip con estilo propio: valores en texto normal, color solo en el marcador. */
export function Tip({
  active,
  payload,
  label,
  fmtLabel,
  fmtValue,
}: {
  active?: boolean
  payload?: TipPayload[]
  label?: string | number
  fmtLabel?: (l: string) => string
  fmtValue?: (v: number, key: string) => string
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null && p.value !== 0)
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-extrabold first-letter:uppercase">{fmtLabel ? fmtLabel(String(label)) : label}</div>
      {rows.length === 0 && <div className="text-muted">Sin datos</div>}
      {rows.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-3 font-bold">{fmtValue ? fmtValue(Number(p.value), String(p.dataKey)) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function KpiTile({
  emoji,
  label,
  value,
  unit,
  hint,
  delta,
  goodWhenUp = true,
  children,
}: {
  emoji: string
  label: string
  value: string
  unit?: string
  hint?: ReactNode
  /** Cambio vs período anterior */
  delta?: number | null
  goodWhenUp?: boolean
  children?: ReactNode
}) {
  const showDelta = delta != null && Math.abs(delta) >= 0.05
  const good = showDelta && (delta! > 0) === goodWhenUp
  return (
    <div className="flex flex-col rounded-3xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <span>{emoji}</span>
        {label}
      </div>
      <div className="mt-1 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-2xl font-black tracking-tight">{value}</span>
          {unit && <span className="ml-0.5 text-sm font-bold text-muted">{unit}</span>}
        </div>
        {children}
      </div>
      {showDelta && (
        <div className={cx('mt-0.5 text-[11px] font-bold', good ? 'text-move' : 'text-coral')}>
          {delta! > 0 ? '▲' : '▼'} {Math.abs(delta!).toLocaleString('es', { maximumFractionDigits: 1 })} vs período anterior
        </div>
      )}
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}
