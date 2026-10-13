import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Modo nube con un Supabase simulado: se interceptan las llamadas a http://supabase.test
 * (Auth y la API REST) para probar crear cuenta, entrar y los errores, sin un servidor real.
 */
const USER_ID = '6f1f5b1e-1111-4222-8333-444444444444'

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
function session(email: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER_ID, email, role: 'authenticated', aud: 'authenticated', exp })}.firma`
  return {
    access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: 'refresh-de-prueba',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      identities: [{ id: USER_ID, user_id: USER_ID, provider: 'email', identity_data: { email } }],
      created_at: new Date().toISOString(),
    },
  }
}

interface Fake {
  accounts: Map<string, string>
  profile: Record<string, unknown> | null
  calls: string[]
}

async function fakeSupabase(page: Page): Promise<Fake> {
  const fake: Fake = { accounts: new Map([['amigo@test.cl', 'secreta123']]), profile: null, calls: [] }
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })

  await page.route('http://supabase.test/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    fake.calls.push(`${req.method()} ${url.pathname}`)
    const body = req.postDataJSON?.() ?? null

    if (url.pathname === '/auth/v1/signup') {
      if (fake.accounts.has(body.email)) return json(route, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
      fake.accounts.set(body.email, body.password)
      return json(route, 200, session(body.email))
    }
    if (url.pathname === '/auth/v1/token') {
      if (fake.accounts.get(body.email) !== body.password)
        return json(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
      return json(route, 200, session(body.email))
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } })
    if (url.pathname === '/auth/v1/user') return json(route, 200, session('amigo@test.cl').user)

    // API REST (PostgREST)
    if (url.pathname === '/rest/v1/profiles') {
      if (req.method() === 'GET') return json(route, 200, fake.profile ? [fake.profile] : [])
      fake.profile = Array.isArray(body) ? body[0] : body
      return json(route, 201, [])
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      if (req.method() === 'GET') return json(route, 200, [])
      return json(route, 201, [])
    }
    return json(route, 404, { msg: 'no simulado' })
  })
  return fake
}

test('crear cuenta con correo y contraseña lleva al onboarding', async ({ page }) => {
  const fake = await fakeSupabase(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel('Correo').fill('nuevo@test.cl')
  await page.getByLabel('Contraseña', { exact: true }).fill('corta')
  await page.getByLabel('Repite la contraseña').fill('corta')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('alert')).toHaveText(/al menos 8 caracteres/)

  await page.getByLabel('Contraseña', { exact: true }).fill('MiClave2026')
  await page.getByLabel('Repite la contraseña').fill('MiClave2026')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()

  await expect(page.getByText('¿Cómo te llamas?')).toBeVisible()
  expect(fake.calls).toContain('POST /auth/v1/signup')
  expect(fake.accounts.get('nuevo@test.cl')).toBe('MiClave2026')

  await page.getByPlaceholder('Tu nombre').fill('Nuevo')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: '¡Empezar! 🎉' }).click()
  await expect(page.getByText('Sueño de anoche')).toBeVisible()
  expect(fake.profile).toMatchObject({ name: 'Nuevo', onboarded: true, user_id: USER_ID })
})

test('entrar: contraseña incorrecta muestra error en español y la correcta entra', async ({ page }) => {
  const fake = await fakeSupabase(page)
  fake.profile = { user_id: USER_ID, name: 'Amigo', track_weight: false, track_cycle: false, goals: {}, onboarded: true }
  await page.goto('/')
  await page.getByLabel('Correo').fill('amigo@test.cl')
  await page.getByLabel('Contraseña', { exact: true }).fill('mala')
  await page.getByRole('button', { name: 'Entrar a mi bitácora' }).click()
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.')

  await page.getByLabel('Contraseña', { exact: true }).fill('secreta123')
  await page.getByRole('button', { name: 'Entrar a mi bitácora' }).click()
  await expect(page.getByText('Sueño de anoche')).toBeVisible()

  await page.getByRole('link', { name: '⚙️ Ajustes' }).click()
  await expect(page.getByText('amigo@test.cl')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Entrar a mi bitácora' })).toBeVisible()
})

test('crear cuenta con un correo ya registrado avisa que use "Entrar"', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel('Correo').fill('amigo@test.cl')
  await page.getByLabel('Contraseña', { exact: true }).fill('OtraClave99')
  await page.getByLabel('Repite la contraseña').fill('OtraClave99')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('alert')).toHaveText(/ya tiene una cuenta/)
})
