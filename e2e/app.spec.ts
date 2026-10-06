import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('primer uso: onboarding, check-in con autoguardado y persistencia', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar mi bitácora desde cero' }).click()

  await page.getByPlaceholder('Tu nombre').fill('Arturo')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Tus metas')).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByPlaceholder('Medicamento o suplemento').fill('Melatonina')
  await page.getByRole('button', { name: 'Agregar' }).last().click()
  await page.getByRole('button', { name: '¡Empezar! 🎉' }).click()

  // Sueño: ejemplo de la hoja (22:15 → 07:47, 7 h dormidas ≈ 74 %)
  await page.getByLabel('1 · Me metí a la cama').fill('22:15')
  await page.getByLabel('7 · Me levanté').fill('07:47')
  for (let i = 0; i < 14; i++) await page.getByRole('button', { name: 'Más horas dormidas' }).click()
  await expect(page.getByText('73 %').first()).toBeVisible()

  await page.getByRole('radio', { name: 'Ánimo 8' }).click()
  await page.getByRole('radio', { name: 'Energía 7' }).click()
  await page.getByRole('radio', { name: 'Estrés 4' }).click()
  await page.getByRole('button', { name: '6 vasos' }).click()
  await page.getByRole('button', { name: /Proteína/ }).click()
  await page.getByRole('button', { name: /\+ 🏋️ Fuerza/ }).click()
  await page.getByRole('button', { name: /Meditación/ }).click()

  await expect(page.getByText('✓ Guardado')).toBeVisible()
  await page.reload()

  await expect(page.getByRole('radio', { name: 'Ánimo 8' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('6 de 8 vasos')).toBeVisible()
  await expect(page.getByLabel('1 · Me metí a la cama')).toHaveValue('22:15')
  await expect(page.getByText('30 min en 1 sesión(es)')).toBeVisible()
})

test('datos demo: dashboard, historial, reportes y CSV', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Explorar con 60 días de ejemplo/ }).click()
  await expect(page.getByText('Sueño de anoche')).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Tu bienestar' })).toBeVisible()
  await expect(page.getByText('Ánimo promedio').first()).toBeVisible()
  await expect(page.getByText(/Los días que dormiste 7 h o más/).first()).toBeVisible()
  await page.getByRole('button', { name: '90 días' }).click()
  await expect(page.getByText('Promedio móvil de 7 días (escala 1–10)')).toBeVisible()

  await page.getByRole('link', { name: 'Historial' }).click()
  await expect(page.getByText('Días registrados', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Reportes' }).click()
  await expect(page.getByText('DIARIO DEL SUEÑO').first()).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /CSV de todo el historial/ }).click()
  const file = await (await download).path()
  const lines = readFileSync(file, 'utf8').trim().split('\n')
  expect(lines[0]).toContain('eficiencia_sueno_pct')
  expect(lines.length).toBeGreaterThan(40)
})
