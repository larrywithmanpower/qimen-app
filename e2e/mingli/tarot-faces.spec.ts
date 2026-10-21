import { test, expect } from './checks'
import { mkdirSync } from 'node:fs'
import { BASE } from './checks'

// 78 張牌面圖都載入得到：在 App 裡把 78 張 faceSrc 的 img 排成一頁截圖存檔，並檢查每張都載入成功
test('78 張牌面截圖存檔', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1100 })
  await page.goto(BASE + '#/tarot?seed=4271')
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
  const count = await page.evaluate(async () => {
    const mod = await import('/src/mingli/tarot/cardArt.ts')
    const grid = document.createElement('div')
    grid.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;grid-template-columns:repeat(13,1fr);gap:6px;padding:8px;background:var(--ml-ground)'
    const imgs: HTMLImageElement[] = []
    for (let i = 0; i < 78; i++) {
      const img = document.createElement('img')
      img.style.cssText = 'width:100%;aspect-ratio:5/8;object-fit:cover;display:block'
      img.src = mod.faceSrc(i)
      imgs.push(img)
      grid.append(img)
    }
    document.body.append(grid)
    // 等每張載入完成（成功或失敗都放行，最後用 naturalWidth 判斷）
    await Promise.all(imgs.map(img => img.decode().catch(() => undefined)))
    return imgs.filter(img => img.complete && img.naturalWidth > 0).length
  })
  expect(count).toBe(78)
  mkdirSync('qa-reports/mingli-v2/tarot-faces', { recursive: true })
  await page.screenshot({ path: 'qa-reports/mingli-v2/tarot-faces/78-cards.png' })
})
