import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Shell'
import { Segmented } from '@/components/ui'
import { MIN_PASSWORD, authErrorMessage } from './authErrors'

type Tab = 'entrar' | 'crear' | 'olvide'

const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

export function Login() {
  const [tab, setTab] = useState<Tab>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = (t: Tab) => {
    setTab(t)
    setError(null)
    setInfo(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setInfo(null)
    const mail = email.trim()

    if (tab === 'crear') {
      if (password.length < MIN_PASSWORD) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
      if (password !== password2) return setError('Las contraseñas no coinciden.')
    }

    setBusy(true)
    try {
      if (tab === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
        if (error) setError(authErrorMessage(error))
      } else if (tab === 'crear') {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) setError(authErrorMessage(error))
        // Supabase no revela si el correo ya existe: devuelve un usuario sin identidades
        else if (data.user && data.user.identities?.length === 0) setError(authErrorMessage({ code: 'user_already_exists' }))
        else if (!data.session) setInfo(`Te enviamos un correo a ${mail} para confirmar tu cuenta. Ábrelo y luego vuelve a entrar.`)
        // Si hay sesión, RepoProvider la detecta y la app continúa al onboarding
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin })
        if (error) setError(authErrorMessage(error))
        else setInfo(`Si ${mail} tiene cuenta, te llegará un correo con un enlace para crear una nueva contraseña.`)
      }
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setError(authErrorMessage(error))
  }

  return (
    <AuthLayout>
      {tab !== 'olvide' && (
        <div className="mb-5">
          <Segmented<Tab>
            value={tab}
            onChange={(v) => v && go(v)}
            options={[
              { value: 'entrar', label: 'Entrar' },
              { value: 'crear', label: 'Crear cuenta' },
            ]}
          />
        </div>
      )}
      {tab === 'olvide' && (
        <>
          <h2 className="text-xl font-black">Recuperar contraseña</h2>
          <p className="mb-4 text-sm text-muted">Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted">Correo</span>
          <input type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" />
        </label>
        {tab !== 'olvide' && (
          <div>
            <div className="mb-1 flex justify-between text-xs font-bold text-muted">
              <label htmlFor="login-password">Contraseña</label>
              <button type="button" className="font-bold text-sleep" onClick={() => setShow((s) => !s)}>
                {show ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              id="login-password"
              type={show ? 'text' : 'password'}
              required
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'crear' ? 'new-password' : 'current-password'}
              placeholder={tab === 'crear' ? `Mínimo ${MIN_PASSWORD} caracteres` : ''}
            />
          </div>
        )}
        {tab === 'crear' && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted">Repite la contraseña</span>
            <input
              type={show ? 'text' : 'password'}
              required
              className="field"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-coral">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm font-bold text-move">
            {info}
          </p>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Un momento…' : tab === 'entrar' ? 'Entrar a mi bitácora' : tab === 'crear' ? 'Crear mi cuenta' : 'Enviarme el enlace'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        {tab === 'entrar' && (
          <button className="font-bold text-sleep" onClick={() => go('olvide')}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {tab === 'olvide' && (
          <button className="font-bold text-sleep" onClick={() => go('entrar')}>
            ← Volver a entrar
          </button>
        )}
      </div>

      {googleEnabled && tab !== 'olvide' && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> o <span className="h-px flex-1 bg-line" />
          </div>
          <button className="btn-ghost w-full" onClick={google}>
            <span className="text-lg">G</span> Continuar con Google
          </button>
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
