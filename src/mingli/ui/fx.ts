// 背景特效的共用狀態：頁面只呼叫這裡的函式，Background 每一格讀同一個物件
import { useSyncExternalStore } from 'react'

export type Realm = 'home' | 'west' | 'east'

export const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export const fx = {
  mode: 0, target: 0, stir: 0,
  mouse: [0.5, 0.5] as [number, number],
  burst: [0.5, 0.5, -99] as [number, number, number],
  t0: performance.now(),
  taiji: 0, taijiT: 1, exp: 0, expT: 0, side: 0, sideT: 1, ang: 0,
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

let realm: Realm = 'home'
let lit: string[] = []

export function setRealm(next: Realm) {
  realm = next
  if (next === 'home') {
    fx.target = 0
    fx.taijiT = 1
    fx.expT = 0
    fx.exp = Math.min(fx.exp, 0.15)
  } else {
    fx.target = next === 'west' ? 1 : 0
    fx.taijiT = 0
  }
  notify()
}

const now = () => ((performance.now() - fx.t0) / 1000) * (prefersReduced() ? 0.25 : 1)

// 在元素中心放一圈漣漪
export function burstAt(el: Element) {
  const r = el.getBoundingClientRect()
  fx.burst = [(r.left + r.width / 2) / innerWidth, 1 - (r.top + r.height / 2) / innerHeight, now()]
}

// 先天八卦層亮起指定的卦（朱砂色），例如 lightTrigrams(['巽', '乾'])
export function lightTrigrams(names: string[]) {
  lit = names
  notify()
}

export const useRealm = () => useSyncExternalStore(subscribe, () => realm)
export const useLitTrigrams = () => useSyncExternalStore(subscribe, () => lit)
