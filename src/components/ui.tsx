import { useState, type ReactNode } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Clases de color por área (deben ser literales para que Tailwind las detecte). */
export const AREA = {
  sleep: { text: 'text-sleep', bg: 'bg-sleep', soft: 'bg-sleep/12', border: 'border-sleep', ring: 'ring-sleep', hex: '#7d70d0' },
  mood: { text: 'text-mood', bg: 'bg-mood', soft: 'bg-mood/12', border: 'border-mood', ring: 'ring-mood', hex: '#b47fd8' },
  move: { text: 'text-move', bg: 'bg-move', soft: 'bg-move/12', border: 'border-move', ring: 'ring-move', hex: '#4f9d78' },
  care: { text: 'text-care', bg: 'bg-care', soft: 'bg-care/12', border: 'border-care', ring: 'ring-care', hex: '#ec8650' },
  food: { text: 'text-food', bg: 'bg-food', soft: 'bg-food/12', border: 'border-food', ring: 'ring-food', hex: '#df6f9c' },
  water: { text: 'text-water', bg: 'bg-water', soft: 'bg-water/12', border: 'border-water', ring: 'ring-water', hex: '#4aa8dc' },
  intake: { text: 'text-intake', bg: 'bg-intake', soft: 'bg-intake/12', border: 'border-intake', ring: 'ring-intake', hex: '#a87850' },
  meds: { text: 'text-meds', bg: 'bg-meds', soft: 'bg-meds/12', border: 'border-meds', ring: 'ring-meds', hex: '#c99a2e' },
  body: { text: 'text-body', bg: 'bg-body', soft: 'bg-body/12', border: 'border-body', ring: 'ring-body', hex: '#5f86a3' },
  cycle: { text: 'text-cycle', bg: 'bg-cycle', soft: 'bg-cycle/12', border: 'border-cycle', ring: 'ring-cycle', hex: '#d9607f' },
  coral: { text: 'text-coral', bg: 'bg-coral', soft: 'bg-coral/12', border: 'border-coral', ring: 'ring-coral', hex: '#e5675b' },
} as const
export type Area = keyof typeof AREA

export function Card({
  area,
  emoji,
  title,
  subtitle,
  done,
  children,
  defaultOpen = true,
  collapsible = true,
  id,
}: {
  area: Area
  emoji: string
  title: string
  subtitle?: ReactNode
  done?: boolean
  children: ReactNode
  defaultOpen?: boolean
  collapsible?: boolean
  id?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const a = AREA[area]
  return (
    <section id={id} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={cx('flex w-full items-center gap-3 px-4 py-3 text-left', !collapsible && 'cursor-default')}
        aria-expanded={open}
      >
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xl', a.soft)}>{emoji}</span>
        <span className="min-w-0 flex-1">
          <span className={cx('block text-[15px] font-extrabold', a.text)}>{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
        </span>
        {done !== undefined && (
          <span
            className={cx(
              'grid h-6 w-6 place-items-center rounded-full text-xs font-black',
              done ? cx(a.bg, 'text-white') : 'border-2 border-line',
            )}
            aria-label={done ? 'Completo' : 'Pendiente'}
          >
            {done && '✓'}
          </span>
        )}
        {collapsible && <span className={cx('text-muted transition', open ? 'rotate-180' : '')}>⌄</span>}
      </button>
      {open && <div className="border-t border-line px-4 pt-3 pb-4">{children}</div>}
    </section>
  )
}

export function Chip({
  active,
  onClick,
  area = 'sleep',
  children,
  size = 'md',
}: {
  active: boolean
  onClick: () => void
  area?: Area
  children: ReactNode
  size?: 'sm' | 'md'
}) {
  const a = AREA[area]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border-2 font-bold transition active:scale-95',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        active ? cx(a.bg, a.border, 'text-white') : 'border-line bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  area = 'sleep',
  allowClear = false,
}: {
  options: { value: T; label: ReactNode }[]
  value: T | null
  onChange: (v: T | null) => void
  area?: Area
  allowClear?: boolean
}) {
  const a = AREA[area]
  return (
    <div className={cx('gap-1 rounded-2xl bg-surface-2 p-1', options.length >= 5 ? 'grid grid-cols-5' : 'flex flex-wrap')}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(allowClear && value === o.value ? null : o.value)}
          className={cx(
            'flex-1 rounded-xl px-1.5 py-1.5 text-xs leading-tight font-bold transition',
            options.length >= 5 ? 'text-[11px]' : 'whitespace-nowrap',
            value === o.value ? cx(a.bg, 'text-white shadow-sm') : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const FACES = ['😫', '😣', '😞', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩']

/** Escala 1–10 de botones; tocar el valor elegido lo borra. */
export function Scale10({
  label,
  value,
  onChange,
  area = 'mood',
  reverse = false,
  low,
  high,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  area?: Area
  /** Para estrés: 10 es peor */
  reverse?: boolean
  low: string
  high: string
}) {
  const a = AREA[area]
  const face = value == null ? '·' : FACES[reverse ? 10 - value : value - 1]
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-sm">
          <span className="mr-1 text-lg">{face}</span>
          <span className={cx('font-black', a.text)}>{value ?? '–'}</span>
          <span className="text-muted">/10</span>
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label} ${n}`}
            onClick={() => onChange(value === n ? null : n)}
            className={cx(
              'h-9 rounded-lg text-xs font-extrabold transition active:scale-90',
              value != null && n <= value ? cx(a.bg, 'text-white') : 'bg-surface-2 text-muted',
              value === n && cx('ring-2 ring-offset-1 ring-offset-surface', a.ring),
            )}
            style={value != null && n <= value ? { opacity: 0.45 + (n / 10) * 0.55 } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  unit,
  area = 'sleep',
  label,
}: {
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  area?: Area
  label?: string
}) {
  const a = AREA[area]
  const v = value ?? 0
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface-2 p-1">
      <button
        type="button"
        aria-label={`Menos ${label ?? ''}`}
        onClick={() => onChange(Math.max(min, +(v - step).toFixed(2)))}
        className="grid h-8 w-8 place-items-center rounded-full bg-surface text-lg font-black text-muted shadow-sm active:scale-90"
      >
        −
      </button>
      <span className={cx('min-w-14 text-center text-sm font-black', a.text)}>
        {value ?? '–'}
        {unit && <span className="ml-0.5 text-xs font-bold text-muted">{unit}</span>}
      </span>
      <button
        type="button"
        aria-label={`Más ${label ?? ''}`}
        onClick={() => onChange(Math.min(max, +(v + step).toFixed(2)))}
        className={cx('grid h-8 w-8 place-items-center rounded-full text-lg font-black text-white shadow-sm active:scale-90', a.bg)}
      >
        +
      </button>
    </div>
  )
}

export function TimeField({
  value,
  onChange,
  label,
}: {
  value: string | null
  onChange: (v: string | null) => void
  label: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      <input
        type="time"
        className="field py-1.5 text-center font-bold"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </label>
  )
}

export function NumberField({
  value,
  onChange,
  label,
  unit,
  step = 1,
  min = 0,
  placeholder,
}: {
  value: number | null
  onChange: (v: number | null) => void
  label: string
  unit?: string
  step?: number
  min?: number
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          placeholder={placeholder}
          className="field py-1.5 pr-10 font-bold"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
        {unit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
    </label>
  )
}

/** Vasos de agua tocables, como en la hoja. */
export function WaterGlasses({ value, goal, onChange }: { value: number; goal: number; onChange: (v: number) => void }) {
  const total = Math.max(goal, value + (value >= goal ? 1 : 0), 8)
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Vasos de agua">
      {Array.from({ length: total }, (_, i) => {
        const filled = i < value
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1} vasos`}
            aria-pressed={filled}
            onClick={() => onChange(value === i + 1 ? i : i + 1)}
            className="transition active:scale-90"
          >
            <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden>
              <path d="M4 3h26l-3.2 33a3 3 0 0 1-3 2.7H10.2a3 3 0 0 1-3-2.7z" fill="none" stroke="currentColor" strokeWidth="2.5" className={filled ? 'text-water' : 'text-line'} />
              {filled && <path d="M6.4 12h21.2l-2.4 24.2a1.5 1.5 0 0 1-1.5 1.3H10.3a1.5 1.5 0 0 1-1.5-1.3z" className="fill-water" />}
              {i >= goal && !filled && <text x="17" y="26" textAnchor="middle" fontSize="12" className="fill-muted">+</text>}
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export function Ring({
  value,
  max,
  size = 56,
  stroke = 7,
  color = AREA.sleep.hex,
  children,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max ? Math.min(1, value / max) : 0
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">{children}</div>
}

export function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-sleep" />
    </div>
  )
}
