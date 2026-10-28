import { useEffect, useState } from 'react'
import './account.css'
import { fetchSiteStatus } from '../ai'
import type { SiteStatus } from '../ai'
import { signIn, signOut, useAuth } from '../auth'

// 「我的」頁最上面的帳號區：未登入說明好處＋登入鈕；登入後顯示名字／信箱、今天剩幾次、登出
export default function AccountCard() {
  const auth = useAuth()
  // 連同是誰的一起存，換人或登出後舊資料自然不顯示
  const [got, setGot] = useState<{ uid: string; quota: SiteStatus['quota'] }>()

  // 登入後才問今天用了幾次
  useEffect(() => {
    const uid = auth.status === 'in' ? auth.uid : undefined
    if (!uid) return
    let alive = true
    fetchSiteStatus().then((s) => { if (alive) setGot({ uid, quota: s.quota }) })
    return () => { alive = false }
  }, [auth.status, auth.uid])

  const quota = got && got.uid === auth.uid ? got.quota : undefined
  const left = quota && quota.signedIn ? Math.max(0, quota.limit - quota.used) : null

  return (
    <section className="ml-account" data-testid="ml-account" data-status={auth.status} aria-label="帳號">
      {auth.status === 'in' && (
        <>
          <div className="ml-account-who" data-testid="ml-account-who">{auth.name || auth.email || '已登入'}</div>
          {auth.name && auth.email && <div className="ml-account-mail">{auth.email}</div>}
          {left !== null && <div className="ml-account-left" data-testid="ml-account-left">今天還能問 {left} 次</div>}
          <button type="button" className="ml-ghost" data-testid="ml-signout" onClick={() => { void signOut() }}>登出</button>
        </>
      )}
      {auth.status === 'out' && (
        <>
          <p className="ml-account-line">登入後每天有自己的 AI 解讀次數，換手機也一樣。生日只存在這台裝置，不會上傳。</p>
          <button type="button" className="ml-ghost" data-testid="ml-signin" onClick={() => { void signIn() }}>用 Google 登入</button>
        </>
      )}
    </section>
  )
}
