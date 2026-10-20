import { test, expect } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import { BASE } from './checks'

// 22 張大牌牌面都畫得出來：在 App 裡把 22 張 faceSVG 排成一頁截圖存檔，並檢查每張都有圖騰線條
test('22 張牌面截圖存檔', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto(BASE + '#/tarot?seed=4271')
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
  const count = await page.evaluate(async () => {
    const mod = await import('/qimen-app/src/mingli/tarot/cardArt.ts')
    const grid = document.createElement('div')
    grid.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;grid-template-columns:repeat(11,1fr);gap:8px;padding:12px;background:var(--ml-ground)'
    for (let i = 0; i < 22; i++) {
      const card = document.createElement('div')
      card.className = 'ml-face'
      card.style.cssText = 'position:relative;aspect-ratio:5/8;transform:none;backface-visibility:visible'
      card.innerHTML = mod.faceSVG(i)
      grid.append(card)
    }
    document.body.append(grid)
    // 每張牌面的圖騰都要有實際畫出的圖形（外框不為 0）
    return [...grid.children].filter(c => {
      const shapes = [...c.querySelectorAll('path, circle, line, rect, polygon, polyline, ellipse')]
      return shapes.some(s => { const b = (s as SVGGraphicsElement).getBBox(); return b.width > 0 || b.height > 0 })
    }).length
  })
  expect(count).toBe(22)
  mkdirSync('qa-reports/mingli-v2/tarot-faces', { recursive: true })
  await page.screenshot({ path: 'qa-reports/mingli-v2/tarot-faces/22-major-arcana.png' })
})
