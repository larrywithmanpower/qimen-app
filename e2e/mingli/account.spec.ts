import type { Page, Route } from 'playwright/test'
import { BASE, askQuestion, checkLayout, expect, prepare, test } from './checks'

// 會員登入＋額度提示畫面測試。
// 登入用 window.__MINGLI_FAKE_AUTH__ 假的（只在 vite dev 生效，完全不載入 firebase），AI 後端用 page.route 攔截。
test.use({ viewport: { width: 390, height: 844 } })

const MOCK_URL = '/__mock-ai'
const FAKE = { uid: 'u-1', token: 'fake-token-1', name: '小明', email: 'ming@example.com' }
type Fake = typeof FAKE | null

const SEED = 4271
const PICKS: [number, number, number] = [3, 9, 17]

const HELP = /1925/

type Quota = { used: number; limit: number; signedIn: boolean } | undefined

// 設好假登入、代理網址與攔截；回傳 POST／GET 收到的 Authorization 標頭
async function setup(page: Page, opts: { fake: Fake; post?: (route: Route) => Promise<void>; quota?: Quota; signInAs?: typeof FAKE }) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.addInitScript(({ url, fake, signInAs }) => {
    const w = window as unknown as Record<string, unknown>
    w.__MINGLI_AI_URL__ = url
    w.__MINGLI_FAKE_AUTH__ = fake
    if (signInAs) w.__MINGLI_FAKE_SIGNIN_AS__ = signInAs
  }, { url: MOCK_URL, fake: opts.fake, signInAs: opts.signInAs })
  const seen: { method: string; auth: string | undefined }[] = []
  await page.route(`**${MOCK_URL}`, async (route) => {
    const req = route.request()
    seen.push({ method: req.method(), auth: req.headers().authorization })
    if (req.method() === 'GET') {
      const body = { ai: true, maintenance: false, ...(opts.quota ? { quota: opts.quota } : {}) }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    await (opts.post ?? ((r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' })))(route)
  })
  return seen
}

const limited = (limit: string) => async (route: Route) => {
  await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: '額度', limit }) })
}

const OPEN: Record<'tarot' | 'meihua' | 'ziwei', (page: Page) => Promise<void>> = {
  tarot: async (page) => {
    await page.goto(`${BASE}#/tarot?seed=${SEED}`)
    await askQuestion(page)
    for (const p of PICKS) {
      await page.getByTestId('ml-fan-card').nth(p).dispatchEvent('click')
      await page.getByTestId('ml-fan-card').nth(p).dispatchEvent('click')
    }
  },
  meihua: async (page) => {
    await page.goto(`${BASE}#/meihua?a=12&b=34`)
    await askQuestion(page)
    await page.getByTestId('ml-to-reading').click()
  },
  ziwei: async (page) => {
    await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=4&g=男`)
    await expect(page.getByTestId('ml-chart')).toBeVisible()
    await page.getByTestId('ml-ai-ziwei-btn').click()
  },
}

const TEXT = {
  user: (k: string) => (k === 'ziwei' ? '今天的 AI 解讀次數用完了，明天再來。' : '今天的 AI 解讀次數用完了，明天再來。下面先看範例解讀。'),
  anon: () => '未登入的共用次數今天用完了。用 Google 登入後，每人每天有自己的次數。',
  budget: () => '今天的 AI 解讀額度已用完，明天再來。',
}

test('請求標頭：未登入沒有 Authorization，假登入帶 Bearer 假 token', async ({ page }) => {
  const out = await setup(page, { fake: null })
  await OPEN.meihua(page)
  await expect(page.getByTestId('ml-ai-help')).toBeVisible()
  const posts = out.filter((s) => s.method === 'POST')
  expect(posts.length).toBeGreaterThan(0)
  expect(out.every((s) => s.auth === undefined)).toBe(true)

  const page2 = await page.context().newPage()
  const inn = await setup(page2, { fake: FAKE })
  await OPEN.meihua(page2)
  await expect(page2.getByTestId('ml-ai-help')).toBeVisible()
  expect(inn.filter((s) => s.method === 'POST').every((s) => s.auth === `Bearer ${FAKE.token}`)).toBe(true)
  expect(inn.filter((s) => s.method === 'POST').length).toBeGreaterThan(0)
  expect(inn.filter((s) => s.method === 'GET').every((s) => s.auth === `Bearer ${FAKE.token}`)).toBe(true)
})

for (const kind of ['tarot', 'meihua', 'ziwei'] as const) {
  for (const limit of ['user', 'anon', 'budget'] as const) {
    test(`${kind}：429 ${limit} → 顯示對的文案與 1925 專線`, async ({ page }) => {
      await setup(page, { fake: limit === 'user' ? FAKE : null, post: limited(limit) })
      await OPEN[kind](page)
      const box = page.getByTestId('ml-ai-limit')
      await expect(box).toBeVisible()
      await expect(box).toHaveAttribute('data-limit', limit)
      await expect(box).toHaveText(new RegExp(`^${TEXT[limit](kind)}`))
      await expect(page.getByTestId('ml-ai-help')).toHaveText(HELP)
      const btn = page.getByTestId('ml-ai-limit-signin')
      await expect(btn).toHaveCount(limit === 'anon' ? 1 : 0)
      if (limit === 'anon') await expect(btn).toHaveText('用 Google 登入')
      if (kind === 'ziwei') await expect(page.getByTestId('ml-ai-error')).toHaveCount(0)
      if (kind !== 'ziwei') await expect(page.getByTestId('ml-reading')).toBeVisible()
      expect(await checkLayout(page)).toEqual([])
    })
  }
}

test('429 沒 limit → 照舊，不顯示額度提示', async ({ page }) => {
  await setup(page, { fake: null, post: async (r) => { await r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"x"}' }) } })
  await OPEN.meihua(page)
  await expect(page.getByTestId('ml-ai-help')).toBeVisible()
  await expect(page.getByTestId('ml-ai-limit')).toHaveCount(0)
})

test('anon 額度提示的登入鈕呼叫 signIn，登入後同一題會重送', async ({ page }) => {
  const NEW = { ...FAKE, uid: 'u-2', token: 'fake-token-2' }
  const seen = await setup(page, { fake: null, signInAs: NEW, post: async (route) => {
    // 帶新 token 的請求一律回 500（只看有沒有重送）；沒帶的回 anon 用完
    if (route.request().headers().authorization) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' })
    await limited('anon')(route)
  } })
  await OPEN.meihua(page)
  await expect(page.getByTestId('ml-ai-limit')).toHaveAttribute('data-limit', 'anon')
  await page.getByTestId('ml-ai-limit-signin').click()
  await expect(page.getByTestId('ml-ai-limit')).toHaveCount(0)
  await expect(page.getByTestId('ml-ai-help')).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __MINGLI_SIGNIN_CALLS__?: number }).__MINGLI_SIGNIN_CALLS__)).toBe(1)
  expect(seen.some((s) => s.method === 'POST' && s.auth === `Bearer ${NEW.token}`)).toBe(true)
})

test('/me 未登入：說明＋登入鈕，沒有登出與剩餘次數', async ({ page }) => {
  await setup(page, { fake: null })
  await page.goto(`${BASE}#/me`)
  const card = page.getByTestId('ml-account')
  await expect(card).toHaveAttribute('data-status', 'out')
  await expect(card).toContainText('登入後每天有自己的 AI 解讀次數，換手機也一樣。生日只存在這台裝置，不會上傳。')
  await expect(page.getByTestId('ml-signin')).toHaveText('用 Google 登入')
  await expect(page.getByTestId('ml-signout')).toHaveCount(0)
  await expect(page.getByTestId('ml-account-left')).toHaveCount(0)
  await page.getByTestId('ml-signin').click()
  expect(await page.evaluate(() => (window as unknown as { __MINGLI_SIGNIN_CALLS__?: number }).__MINGLI_SIGNIN_CALLS__)).toBe(1)
})

test('/me 已登入：名字、今天還能問 3 次（used 2 / limit 5）、登出', async ({ page }) => {
  const seen = await setup(page, { fake: FAKE, quota: { used: 2, limit: 5, signedIn: true } })
  await page.goto(`${BASE}#/me`)
  const card = page.getByTestId('ml-account')
  await expect(card).toHaveAttribute('data-status', 'in')
  await expect(page.getByTestId('ml-account-who')).toHaveText('小明')
  await expect(card).toContainText('ming@example.com')
  await expect(page.getByTestId('ml-account-left')).toHaveText('今天還能問 3 次')
  expect(seen.some((s) => s.method === 'GET' && s.auth === `Bearer ${FAKE.token}`)).toBe(true)
  await page.getByTestId('ml-signout').click()
  await expect(card).toHaveAttribute('data-status', 'out')
  await expect(page.getByTestId('ml-signin')).toBeVisible()
})

test('/me 已登入但後端沒給 quota → 不顯示剩餘次數那行', async ({ page }) => {
  await setup(page, { fake: FAKE })
  await page.goto(`${BASE}#/me`)
  await expect(page.getByTestId('ml-account-who')).toBeVisible()
  await expect(page.getByTestId('ml-account-left')).toHaveCount(0)
})

test('/me 剩餘次數已用完 → 顯示 0 次，不出現負數', async ({ page }) => {
  await setup(page, { fake: FAKE, quota: { used: 7, limit: 5, signedIn: true } })
  await page.goto(`${BASE}#/me`)
  await expect(page.getByTestId('ml-account-left')).toHaveText('今天還能問 0 次')
})

for (const [name, fake] of [['未登入', null], ['已登入', FAKE]] as const) {
  for (const width of [390, 820, 1440]) {
    test(`/me ${name} ${width} 寬：沒有橫向捲動、版面檢查通過`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await setup(page, { fake, quota: { used: 2, limit: 5, signedIn: true } })
      await page.goto(`${BASE}#/me`)
      await expect(page.getByTestId('ml-account')).toHaveAttribute('data-status', fake ? 'in' : 'out')
      if (fake) await expect(page.getByTestId('ml-account-left')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      expect(await checkLayout(page)).toEqual([])
    })
  }
}

test('隱私權聲明有會員登入段落', async ({ page }) => {
  await setup(page, { fake: null })
  await page.goto(`${BASE}#/privacy`)
  const p = page.getByTestId('ml-privacy')
  await expect(p).toContainText('會員登入')
  await expect(p).toContainText('Firebase Authentication')
  await expect(p).toContainText('不存你的生日')
})
