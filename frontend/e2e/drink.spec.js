import { test, expect } from '@playwright/test'

test('um telemóvel chega à primeira carta do Modo Beber', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sim, tenho 18 ou mais' }).click()
  await expect(page.getByRole('button', { name: 'Beber', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Beber', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nome do jogador' }).fill('Ana')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await page.getByRole('textbox', { name: 'Nome do jogador' }).fill('Bruno')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await page.getByRole('button', { name: /Começar com 2/ }).click()

  await expect(page.getByRole('heading', { name: 'Modo Beber' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Essencial/ })).toBeVisible()
  await page.getByRole('button', { name: /Começar ·/ }).click()
  const draw = page.getByRole('button', { name: 'Ver carta' })
  await expect(draw).toBeVisible()
  await expect(draw).toBeInViewport()
})
