/**
 * Captura ecrãs reais da app para o README de portfolio.
 * Requer `npm run dev` (Vite :5173 + API :3001).
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'docs', 'screenshots')
const BASE = process.env.PARTYMIX_URL || 'http://localhost:5173'
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESKTOP = { width: 1280, height: 800, deviceScaleFactor: 1 }

const ROSTER = {
  names: ['Ana', 'Bruno', 'Clara', 'Diogo'],
  genders: ['f', 'm', 'f', 'm'],
}

const EXPLICIT = /pénis|vagina|anal|sexo oral|gozar|foder|cona|caralho|punheta|mamada|dildo/i

function seedStorage() {
  localStorage.setItem('partymix_age_gate_v1', '18')
  localStorage.setItem('partyMixNightRoster', JSON.stringify({
    names: ['Ana', 'Bruno', 'Clara', 'Diogo'],
    genders: ['f', 'm', 'f', 'm'],
  }))
}

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 700)
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: opts.fullPage ?? true, animations: 'disabled' })
  console.log('  ok', name)
  return path
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(500)
}

async function fillVisibleInputs(page, values) {
  const inputs = page.locator('input[placeholder="Nome"], input[placeholder^="Ex.:"], input[placeholder="Como te chamas?"]')
  const n = await inputs.count()
  for (let i = 0; i < Math.min(n, values.length); i++) {
    const el = inputs.nth(i)
    if (await el.isVisible()) {
      await el.fill('')
      await el.fill(values[i])
    }
  }
}

async function clickText(page, text, timeout = 8000) {
  const btn = page.getByRole('button', { name: text })
  await btn.first().waitFor({ state: 'visible', timeout })
  await btn.first().click()
}

async function makePhoto(page, label, color) {
  const bytes = await page.evaluate(async ({ label, color }) => {
    const c = document.createElement('canvas')
    c.width = 720
    c.height = 720
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 720, 720)
    ctx.fillStyle = 'rgba(255,255,255,.12)'
    ctx.beginPath()
    ctx.arc(180, 160, 140, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '800 54px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, 360, 380)
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }, { label, color })
  return Buffer.from(bytes)
}

async function withContext(browser, viewport, seedAge, fn) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile || false,
    hasTouch: viewport.hasTouch || false,
    locale: 'pt-PT',
    colorScheme: 'dark',
  })
  if (seedAge) {
    await context.addInitScript(seedStorage)
    await context.addInitScript((roster) => {
      localStorage.setItem('partyMixNightRoster', JSON.stringify(roster))
    }, ROSTER)
  }
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  try {
    await fn(page, context)
  } finally {
    await context.close()
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })

  try {
    console.log('Age gate + Home')
    await withContext(browser, PHONE, false, async (page) => {
      await goto(page, '/')
      await page.getByText('Tens 18 anos ou mais?').waitFor()
      await shot(page, '00-age-gate', { fullPage: false })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/')
      await page.getByText('Party').first().waitFor()
      await shot(page, '01-home-mobile', { fullPage: true, wait: 1200 })
    })

    await withContext(browser, DESKTOP, true, async (page) => {
      await goto(page, '/')
      await page.getByText('Party').first().waitFor()
      await shot(page, '01-home-desktop', { fullPage: false, wait: 1200 })
    })

    console.log('Beber')
    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/DrinkGame')
      await page.getByText('Modo Beber').waitFor()
      await shot(page, '02-beber-jogadores', { fullPage: true })
      await clickText(page, /Escolher decks/)
      await page.getByText('Que packs queres à mesa?').waitFor()
      await shot(page, '02-beber-packs', { fullPage: true })
      await clickText(page, /Começar/)
      await page.waitForTimeout(900)
      const body = await page.locator('body').innerText()
      if (!EXPLICIT.test(body)) {
        await shot(page, '02-beber-jogo', { fullPage: false })
      } else {
        console.log('  skip 02-beber-jogo (texto explícito)')
      }
    })

    console.log('Família / Amigos / Casal')
    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/GameSetup?mode=family')
      await page.getByText('Modo Família').waitFor()
      await shot(page, '03-familia-setup', { fullPage: true })
      await clickText(page, 'Continuar')
      await page.getByText(/Começar Jogo/).waitFor()
      await shot(page, '03-familia-regras', { fullPage: true })
      await clickText(page, /Começar Jogo/)
      await page.waitForTimeout(1000)
      await shot(page, '03-familia-mapa', { fullPage: false })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/GameSetup?mode=friends')
      await page.getByText('Modo Amigos').waitFor()
      await shot(page, '04-amigos-setup', { fullPage: true })
      await clickText(page, 'Continuar')
      await page.getByText('Como jogar').waitFor()
      await shot(page, '04-amigos-modos', { fullPage: true })
      await clickText(page, /Começar Jogo/)
      await page.waitForTimeout(1000)
      await shot(page, '04-amigos-mapa', { fullPage: false })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/GameSetup?mode=couple')
      await page.getByText('Modo Casal').waitFor()
      await shot(page, '05-casal-setup', { fullPage: true })
      await clickText(page, /Começar Jogo/)
      await page.getByText('Intensidade').waitFor()
      await shot(page, '05-casal-menu', { fullPage: true })
    })

    console.log('Cartas')
    await withContext(browser, PHONE, true, async (page, context) => {
      await goto(page, '/CardsLobby')
      await page.getByPlaceholder('Como te chamas?').fill('Ana')
      await shot(page, '06-cartas-entrar', { fullPage: true })
      await clickText(page, 'Criar sala')
      await page.getByText('Modo Cartas').waitFor()
      const dark = page.getByRole('button', { name: /Lado Negro/ })
      if (await dark.count()) await dark.first().click()
      await shot(page, '06-cartas-baralhos', { fullPage: true })
      await clickText(page, /Criar Sala Online/)
      await page.getByText('Sala Online').waitFor({ timeout: 15000 })

      const code = (await page.locator('body').innerText()).match(/\b[A-Z0-9]{6}\b/)?.[0]
      if (code) {
        const guest = await context.newPage()
        await guest.goto(`${BASE}/CardsLobby`, { waitUntil: 'domcontentloaded' })
        await guest.getByPlaceholder('Como te chamas?').fill('Bruno')
        await guest.getByPlaceholder('ABC234').fill(code)
        await guest.getByRole('button', { name: 'Tenho um código' }).click()
        await page.getByText('2 jogadores', { exact: true }).waitFor({ timeout: 15000 })
        await shot(page, '06-cartas-sala', { fullPage: true, wait: 400 })
        await page.getByRole('button', { name: /Iniciar Jogo/ }).click()
        await page.waitForTimeout(1400)
        const text = await page.locator('body').innerText()
        if (!EXPLICIT.test(text)) await shot(page, '06-cartas-jogo', { fullPage: false })
        else console.log('  skip 06-cartas-jogo (texto explícito)')
        await guest.close()
      }
    })

    console.log('MemeMix')
    await withContext(browser, PHONE, true, async (page, context) => {
      await goto(page, '/MemeMixLobby')
      await page.getByPlaceholder('Como te chamas?').fill('Ana')
      await shot(page, '07-mememix-entrar', { fullPage: true })
      await clickText(page, 'Criar sala')
      await page.getByText(/MemeMix ·/).waitFor({ timeout: 15000 })
      await shot(page, '07-mememix-sala', { fullPage: true })

      const consent = page.getByText(/Tenho permissão/)
      if (await consent.count()) {
        await page.locator('input[type="checkbox"]').first().check().catch(async () => {
          await consent.click()
        })
      }
      const photos = [
        await makePhoto(page, 'Festa', '#be185d'),
        await makePhoto(page, 'Mesa', '#7c3aed'),
        await makePhoto(page, 'Noite', '#0f766e'),
      ]
      const file = page.locator('input[type="file"]')
      if (await file.count()) {
        await file.setInputFiles(photos.map((buffer, i) => ({
          name: `foto-${i + 1}.png`,
          mimeType: 'image/png',
          buffer,
        })))
        await page.waitForTimeout(2500)
      }
      await shot(page, '07-mememix-fotos', { fullPage: true })

      const code = (await page.locator('body').innerText()).match(/\b[A-Z0-9]{6}\b/)?.[0]
      if (code) {
        const guest = await context.newPage()
        await guest.goto(`${BASE}/MemeMixLobby`, { waitUntil: 'domcontentloaded' })
        await guest.getByPlaceholder('Como te chamas?').fill('Bruno')
        await guest.getByPlaceholder('ABC234').fill(code)
        await guest.getByRole('button', { name: 'Tenho um código' }).click()
        await guest.waitForTimeout(1200)
        const start = page.getByRole('button', { name: /Começar/ })
        if (await start.isEnabled()) {
          await start.click()
          await page.getByText(/Polaroid|Meme da ronda|legenda/i).waitFor({ timeout: 12000 }).catch(() => {})
          await shot(page, '07-mememix-jogo', { fullPage: false, wait: 900 })
        } else {
          console.log('  skip 07-mememix-jogo (ainda sem fotos/jogadores)')
        }
        await guest.close()
      }
    })

    console.log('Mister White / Aldeia / Comunidade')
    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/MisterWhite')
      await page.getByText('Mister White').waitFor()
      await shot(page, '08-mister-hub', { fullPage: true })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/MisterWhiteGame')
      await page.waitForTimeout(400)
      await shot(page, '08-mister-local', { fullPage: true })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/MisterWhiteLobby')
      await page.getByPlaceholder('Como te chamas?').fill('Ana')
      await clickText(page, 'Criar sala')
      await page.waitForTimeout(1200)
      await shot(page, '08-mister-sala', { fullPage: true })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/AldeiaMix')
      await page.getByText('AldeiaMix').waitFor()
      await shot(page, '09-aldeia-hub', { fullPage: true })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/AldeiaMixLobby')
      await page.getByPlaceholder('Como te chamas?').fill('Ana')
      await clickText(page, 'Criar sala')
      await page.waitForTimeout(1200)
      await shot(page, '09-aldeia-sala', { fullPage: true })
    })

    await withContext(browser, PHONE, true, async (page) => {
      await goto(page, '/community')
      await page.waitForTimeout(800)
      await shot(page, '10-comunidade', { fullPage: true })
    })

    console.log('Pronto →', OUT)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
