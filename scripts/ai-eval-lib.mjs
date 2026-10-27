// AI 實測的純函式：卡號集合的重疊率（Jaccard）

// 兩個集合的 Jaccard：交集 / 聯集；兩邊都空算 1
export function jaccard(a, b) {
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size === 0 && sb.size === 0) return 1
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter++
  return inter / (sa.size + sb.size - inter)
}

export const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

// 一題多次的重疊率：所有兩兩組合的 Jaccard 平均。
// 某次呼叫失敗（null）視為和任何一次都完全不重疊（0），不能因為失敗而讓分數變好
export function overlapRate(runs) {
  if (runs.length < 2) return 0
  const scores = []
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      scores.push(runs[i] && runs[j] ? jaccard(runs[i], runs[j]) : 0)
    }
  }
  return mean(scores)
}

// 台灣日期 YYYY-MM-DD（UTC+8）
export const taiwanDate = (nowMs = Date.now()) => new Date(nowMs + 8 * 3600 * 1000).toISOString().slice(0, 10)
