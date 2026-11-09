import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// 三個淺色區＋儀式區：內文字對底色的對比要 ≥ 4.5（WCAG AA）
const css = readFileSync(join(__dirname, '..', 'styles', 'tokens.css'), 'utf8')

// 取出某個選擇器開頭的區塊裡的變數
function block(selectorStart: string): Record<string, string> {
  const i = css.indexOf(selectorStart)
  if (i < 0) throw new Error(`找不到 ${selectorStart}`)
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/(--ml-[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const lum = (hex: string) => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(n.slice(k, k + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const TEXT = ['--ml-ink', '--ml-ink-body', '--ml-ink-soft', '--ml-ink-muted', '--ml-ink-faint', '--ml-cinnabar-text']

describe('淺色區文字對比 ≥ 4.5', () => {
  for (const realm of ['home', 'east', 'west']) {
    const v = block(`[data-ml-realm="${realm}"], html:has`)
    for (const bg of ['--ml-ground', '--ml-surface']) {
      for (const t of TEXT) {
        it(`${realm}：${t} 在 ${bg} 上`, () => {
          expect(ratio(v[t], v[bg])).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
  }
})

describe('儀式區（深色）文字對比 ≥ 4.5', () => {
  const east = block('.ml-ritual {')
  const westOverride = block('[data-ml-realm="west"] .ml-ritual {')
  const west = { ...east, ...westOverride }
  for (const [name, v] of [['東方', east], ['西方', west]] as const) {
    for (const t of ['--ml-ink', '--ml-ink-body', '--ml-ink-muted', '--ml-ink-faint']) {
      it(`${name}儀式區：${t}`, () => {
        expect(ratio(v[t], v['--ml-ground'])).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
