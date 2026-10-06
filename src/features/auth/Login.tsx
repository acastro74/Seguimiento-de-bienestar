import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Shell'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  const google = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center">
          <div className="text-5xl">📬</div>
          <h2 className="mt-3 text-xl font-black">Revisa tu correo</h2>
          <p className="mt-1 text-sm text-muted">
            Te enviamos un enlace a <b>{email}</b>. Ábrelo en este mismo dispositivo para entrar.
          </p>
          <button className="btn-ghost mt-4" onClick={() => setSent(false)}>
            Usar otro correo
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-black">Entrar</h2>
          <p className="mb-4 text-sm text-muted">Sin contraseñas: te enviamos un enlace a tu correo.</p>
          <form onSubmit={sendLink} className="space-y-3">
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviarme el enlace'}
            </button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> o <span className="h-px flex-1 bg-line" />
          </div>
          <button className="btn-ghost w-full" onClick={google}>
            <span className="text-lg">G</span> Continuar con Google
          </button>
          {error && <p className="mt-3 text-sm font-bold text-coral">{error}</p>}
        </>
      )}
    </AuthLayout>
  )
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_20%_10%,rgb(125_112_208/0.18),transparent_45%),radial-gradient(circle_at_90%_90%,rgb(79_157_120/0.15),transparent_45%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <p className="mb-6 text-center text-sm text-muted">
          Registra cómo duermes, comes, te mueves y te sientes — y descubre qué hábitos te hacen bien.
        </p>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
