import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000))

async function startFromScratch(page: Page, name = 'Arturo') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar mi bitácora desde cero' }).click()
  await page.getByPlaceholder('Tu nombre').fill(name)
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: '¡Empezar! 🎉' }).click()
  await expect(page.getByText('Sueño de anoche')).toBeVisible()
}

test('la app no se queda pegada en un día: avanza sola a medianoche y al volver a la pestaña', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T23:58:00') })
  await startFromScratch(page)
  await expect(page.getByRole('heading', { name: /7 de octubre/ })).toBeVisible()

  // Pasa la medianoche con la pestaña abierta
  await page.clock.runFor('05:00')
  await expect(page.getByRole('heading', { name: /8 de octubre/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /jueves 8 de octubre/ })).toHaveAttribute('aria-current', 'date')

  // Se puede registrar el día nuevo
  await page.getByRole('radio', { name: 'Ánimo 9' }).click()
  await expect(page.getByText('✓ Guardado')).toBeVisible()

  // La app queda en segundo plano varios días y luego se vuelve a abrir
  await page.clock.setSystemTime(new Date('2026-10-12T09:00:00'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('heading', { name: /12 de octubre/ })).toBeVisible()

  // Volver al día 8: el registro sigue ahí y aparece el aviso "Ir a hoy"
  await page.goto('/?fecha=2026-10-08')
  await expect(page.getByText(/Estás editando el/)).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Ánimo 9' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Ir a hoy' }).click()
  await expect(page.getByRole('heading', { name: /12 de octubre/ })).toBeVisible()
  await expect(page.getByText(/Estás editando el/)).toHaveCount(0)
})

test('dos pestañas abiertas no borran los datos de la otra', async ({ context }) => {
  const a = await context.newPage()
  await startFromScratch(a)
  const b = await context.newPage()
  await b.goto(`/?fecha=${daysAgo(2)}`)
  await expect(b.getByText('Sueño de anoche')).toBeVisible()

  await a.goto(`/?fecha=${daysAgo(1)}`)
  await a.getByRole('radio', { name: 'Ánimo 7' }).click()
  await expect(a.getByText('✓ Guardado')).toBeVisible()

  // La pestaña B se abrió antes de que A guardara
  await b.getByRole('radio', { name: 'Ánimo 4' }).click()
  await expect(b.getByText('✓ Guardado')).toBeVisible()

  await a.reload()
  await expect(a.getByRole('radio', { name: 'Ánimo 7' })).toHaveAttribute('aria-checked', 'true')
  await a.goto(`/?fecha=${daysAgo(2)}`)
  await expect(a.getByRole('radio', { name: 'Ánimo 4' })).toHaveAttribute('aria-checked', 'true')
})

test('respaldo: descargar, borrar todo e importar recupera los datos', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('button', { name: /Explorar con 60 días de ejemplo/ }).click()
  await page.getByRole('link', { name: 'Ajustes' }).click()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar respaldo/ }).click()
  const file = await (await download).path()
  const backup = JSON.parse(readFileSync(file, 'utf8'))
  expect(backup.app).toBe('bitacora-bienestar')
  expect(backup.days.length).toBeGreaterThan(40)

  await page.getByRole('button', { name: 'Borrar todo y empezar de nuevo' }).click()
  await expect(page.getByRole('button', { name: 'Empezar mi bitácora desde cero' })).toBeVisible()
  await startFromScratch(page, 'Nueva')

  await page.getByRole('link', { name: 'Ajustes' }).click()
  await page.getByLabel('Archivo de respaldo').setInputFiles(file)
  await expect(page.getByText(`Listo: se importaron ${backup.days.length} días.`)).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByText(/Los días que dormiste 7 h o más/).first()).toBeVisible()
  // Los hábitos del respaldo se fusionan con los de la cuenta nueva por nombre (sin duplicados)
  await page.getByRole('link', { name: 'Hoy' }).click()
  await expect(page.getByRole('button', { name: /Meditación/ })).toHaveCount(1)
})
