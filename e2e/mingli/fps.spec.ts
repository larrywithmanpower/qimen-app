import { test, expect } from './checks'
import { BASE } from './checks'

// 動畫流暢度：手機寬 390、CPU 降速 4 倍，量 5 秒內瀏覽器實際畫了幾格（requestAnimationFrame 次數）
// 2026-11-09 起深色 WebGL 背景拿掉，改量羅盤、星盤、跑馬燈這些 CSS 動畫跑起來順不順
// 只在交件前跑：FPS=1 npx playwright test -c playwright.mingli.config.ts fps
// 用實體 GPU 量要開視窗：FPS=1 HEADED=1（只在 L 允許開視窗的時段）
test.skip(!process.env.FPS, '交件前才跑（設 FPS=1）')
test.use({ headless: !process.env.HEADED })

const PAGES = [
  { name: '首頁（跑馬燈＋羅盤）', hash: '#/' },
  { name: '塔羅（星盤）', hash: '#/tarot?seed=4271' },
  { name: '梅花（八卦羅盤）', hash: '#/meihua?t=2024-03-15T23:30' },
]

for (const pg of PAGES) {
  test(`fps ${pg.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto(BASE + pg.hash)
    await page.waitForTimeout(1500)
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '未知'
    })
    const fps = await page.evaluate(() => new Promise<number>((done) => {
      let n = 0
      const t0 = performance.now()
      const tick = () => { n += 1; if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else done(n / 5) }
      requestAnimationFrame(tick)
    }))
    console.log(`[fps] ${pg.name}：${fps.toFixed(1)} 格／秒（${process.env.HEADED ? 'headed' : 'headless'}，CPU ×4 降速，算圖：${renderer}）`)
    expect(fps).toBeGreaterThanOrEqual(30)
  })
}
