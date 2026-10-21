// 日期選擇器用的純函式（YYYY-MM-DD 字串運算，不依賴時區）

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** 組成 YYYY-MM-DD，月、日補零（月 1~12） */
export const toIso = (y: number, m: number, d: number) => `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`

/** 解析 YYYY-MM-DD；格式或日期不合法回 null */
export function parseIso(s: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
  return { y, m, d }
}

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** 某月天數（月 1~12） */
export function daysInMonth(y: number, m: number) {
  if (m === 2) return isLeapYear(y) ? 29 : 28
  return [4, 6, 9, 11].includes(m) ? 30 : 31
}

/** 某月 1 號是星期幾（0 = 日 … 6 = 六） */
export const firstWeekday = (y: number, m: number) => new Date(y, m - 1, 1).getDay()

/** 日期是否在 [min, max] 內（含邊界）；字串同格式可直接比較 */
export const inRange = (iso: string, min: string, max: string) => iso >= min && iso <= max

/** 整個月是否至少有一天在範圍內 */
export const monthInRange = (y: number, m: number, min: string, max: string) =>
  toIso(y, m, daysInMonth(y, m)) >= min && toIso(y, m, 1) <= max

/** 欄位顯示文字：1990 年 7 月 5 日 */
export function formatDisplay(iso: string) {
  const p = parseIso(iso)
  return p ? `${p.y} 年 ${p.m} 月 ${p.d} 日` : ''
}

/** 月份加減（跨年），回傳 { y, m } */
export function shiftMonth(y: number, m: number, delta: number) {
  const idx = y * 12 + (m - 1) + delta
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
}

/** 年份頁（12 年一頁）起點，頁面以 minYear 對齊 */
export const yearPageStart = (y: number, minYear: number) => minYear + Math.floor((y - minYear) / 12) * 12
