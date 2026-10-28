// Google 會員登入（Firebase Authentication）。
// firebase 一律動態 import：沒登入過的人完全不會下載它，主程式包也不含它。
// 判斷「登入過」靠 localStorage 的小旗標；旗標在才載入 firebase 還原登入狀態
import { useEffect, useSyncExternalStore } from 'react'

// 公開識別碼（不是祕密）。authDomain 刻意用網站同網域，Safari 才不會擋第三方儲存
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAPuduA9TmPP7MBwO90xkFDIPhEvhJG9Pw',
  authDomain: 'mingli-yuxuan.web.app',
  projectId: 'qimen-app-487007',
  appId: '1:978441890880:web:a8590bb40de4918d2683a5',
  messagingSenderId: '978441890880',
}

const HINT_KEY = 'ml-auth-hint'

export interface AuthState {
  status: 'loading' | 'out' | 'in'
  uid?: string
  name?: string
  email?: string
}

// ───────── 測試掛勾（只在 vite dev 生效，正式版會被拿掉）─────────
// window.__MINGLI_FAKE_AUTH__ = { uid, token, name, email } | null：有設就完全不載入 firebase
// window.__MINGLI_FAKE_SIGNIN_AS__：假的 signIn() 之後變成這個人；window.__MINGLI_SIGNIN_CALLS__：signIn 被呼叫幾次
interface FakeUser { uid: string; token: string; name?: string; email?: string }
interface FakeWindow {
  __MINGLI_FAKE_AUTH__?: FakeUser | null
  __MINGLI_FAKE_SIGNIN_AS__?: FakeUser
  __MINGLI_SIGNIN_CALLS__?: number
}
const fakeWin = (): FakeWindow | null => (import.meta.env.DEV && typeof window !== 'undefined' ? (window as unknown as FakeWindow) : null)
const hasFake = () => { const w = fakeWin(); return !!w && w.__MINGLI_FAKE_AUTH__ !== undefined }

let fakeUser: FakeUser | null = null
const fromFake = (u: FakeUser | null): AuthState => (u ? { status: 'in', uid: u.uid, name: u.name, email: u.email } : { status: 'out' })

const readHint = () => {
  try { return localStorage.getItem(HINT_KEY) === '1' } catch { return false }
}
const writeHint = (on: boolean) => {
  try { if (on) localStorage.setItem(HINT_KEY, '1'); else localStorage.removeItem(HINT_KEY) } catch { /* 無痕模式寫不進去就算了 */ }
}

function initialState(): AuthState {
  if (hasFake()) {
    fakeUser = fakeWin()!.__MINGLI_FAKE_AUTH__ ?? null
    return fromFake(fakeUser)
  }
  if (typeof window === 'undefined') return { status: 'out' }
  return readHint() ? { status: 'loading' } : { status: 'out' }
}

let state: AuthState = initialState()
const listeners = new Set<() => void>()
function setState(next: AuthState) {
  state = next
  listeners.forEach((f) => f())
}

// ───────── 載入 firebase ─────────
type AuthMod = typeof import('firebase/auth')
interface Loaded { mod: AuthMod; auth: import('firebase/auth').Auth }
let loading: Promise<Loaded | null> | null = null
let firstState: Promise<void> | null = null

function load(): Promise<Loaded | null> {
  if (loading) return loading
  loading = (async () => {
    try {
      const [{ initializeApp }, mod] = await Promise.all([import('firebase/app'), import('firebase/auth')])
      const auth = mod.getAuth(initializeApp(FIREBASE_CONFIG))
      // 第一次回報（含 redirect 回來的結果）才算還原完成
      firstState = new Promise<void>((resolve) => {
        mod.onAuthStateChanged(auth, (user) => {
          writeHint(!!user)
          setState(user ? { status: 'in', uid: user.uid, name: user.displayName ?? undefined, email: user.email ?? undefined } : { status: 'out' })
          resolve()
        })
      })
      await firstState
      return { mod, auth }
    } catch {
      writeHint(false)
      setState({ status: 'out' })
      return null
    }
  })()
  return loading
}

// 登入過（旗標在）才在背景載入 firebase 還原狀態
function ensureRestored() {
  if (hasFake() || typeof window === 'undefined') return
  if (state.status === 'loading') void load()
}

// ───────── 對外 ─────────

// 目前登入者的 ID token；沒登入回 null。還在還原登入狀態就等它
export async function getIdToken(): Promise<string | null> {
  if (hasFake()) return fakeUser?.token ?? null
  if (state.status === 'out' && !loading) return null
  const l = await load()
  if (!l) return null
  try {
    return (await l.auth.currentUser?.getIdToken()) ?? null
  } catch {
    return null
  }
}

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
}

export async function signIn(): Promise<void> {
  if (hasFake()) {
    const w = fakeWin()!
    w.__MINGLI_SIGNIN_CALLS__ = (w.__MINGLI_SIGNIN_CALLS__ ?? 0) + 1
    if (w.__MINGLI_FAKE_SIGNIN_AS__) {
      fakeUser = w.__MINGLI_FAKE_SIGNIN_AS__
      setState(fromFake(fakeUser))
    }
    return
  }
  const l = await load()
  if (!l) return
  const provider = new l.mod.GoogleAuthProvider()
  // 獨立視窗（加到主畫面的 PWA）彈窗常被擋或回不來，直接整頁跳轉
  if (isStandalone()) {
    writeHint(true)
    await l.mod.signInWithRedirect(l.auth, provider)
    return
  }
  try {
    await l.mod.signInWithPopup(l.auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'auth/popup-blocked') {
      writeHint(true)
      await l.mod.signInWithRedirect(l.auth, provider)
    }
    // 使用者自己關掉彈窗、重複點擊等：維持原狀，不吵人
  }
}

export async function signOut(): Promise<void> {
  if (hasFake()) {
    fakeUser = null
    setState(fromFake(null))
    return
  }
  writeHint(false)
  const l = await load()
  if (l) await l.mod.signOut(l.auth)
  setState({ status: 'out' })
}

const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => { listeners.delete(f) }
}

export function useAuth(): AuthState {
  useEffect(() => { ensureRestored() }, [])
  return useSyncExternalStore(subscribe, () => state, () => state)
}
