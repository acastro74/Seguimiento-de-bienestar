import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MIN_PASSWORD, authErrorMessage } from './authErrors'

/** Formulario para elegir una contraseña nueva (recuperación o cambio desde Ajustes). */
export function PasswordForm({ onDone, submitLabel = 'Guardar contraseña' }: { onDone?: () => void; submitLabel?: string }) {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setOk(false)
    if (password.length < MIN_PASSWORD) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    if (password !== password2) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(authErrorMessage(error))
    setOk(true)
    setPassword('')
    setPassword2('')
    onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="password" required className="field" placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD})`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      <input type="password" required className="field" placeholder="Repite la nueva contraseña" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
      {error && (
        <p role="alert" className="text-sm font-bold text-coral">
          {error}
        </p>
      )}
      {ok && (
        <p role="status" className="text-sm font-bold text-move">
          ✓ Contraseña actualizada
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}
