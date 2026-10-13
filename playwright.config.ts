import { defineConfig, devices } from '@playwright/test'

const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { ...devices['Pixel 7'], locale: 'es-CL', launchOptions },
  projects: [
    // Sin variables de Supabase: la app corre en modo demo (localStorage)
    { name: 'demo', testIgnore: /cloud\.spec/, use: { baseURL: 'http://localhost:4174' } },
    // Con un Supabase falso (las respuestas se simulan en la prueba)
    { name: 'cloud', testMatch: /cloud\.spec/, use: { baseURL: 'http://localhost:4175' } },
  ],
  webServer: [
    {
      command: 'npx vite build --outDir dist-e2e-demo && npx vite preview --outDir dist-e2e-demo --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    },
    {
      command: 'npx vite build --outDir dist-e2e-cloud && npx vite preview --outDir dist-e2e-cloud --port 4175 --strictPort',
      url: 'http://localhost:4175',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: 'http://supabase.test', VITE_SUPABASE_ANON_KEY: 'anon-key-de-prueba' },
    },
  ],
})
