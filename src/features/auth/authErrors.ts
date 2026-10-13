/** Traduce los errores más comunes de Supabase Auth a mensajes en español. */
export function authErrorMessage(e: { message?: string; code?: string } | null | undefined): string {
  const code = e?.code ?? ''
  const msg = (e?.message ?? '').toLowerCase()
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered'))
    return 'Ese correo ya tiene una cuenta. Usa "Entrar".'
  if (code === 'weak_password' || msg.includes('password should')) return 'La contraseña es muy débil: usa al menos 8 caracteres.'
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada (o pide al administrador que desactive la confirmación).'
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) return 'El registro de cuentas nuevas está desactivado.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit'))
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
  if (code === 'validation_failed' || msg.includes('invalid format') || msg.includes('unable to validate email'))
    return 'Revisa el correo: el formato no es válido.'
  if (code === 'same_password') return 'La nueva contraseña debe ser distinta de la anterior.'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sin conexión con el servidor. Revisa tu internet.'
  return e?.message || 'Ocurrió un error inesperado.'
}

export const MIN_PASSWORD = 8
