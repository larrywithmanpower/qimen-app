import { useEffect, useState } from 'react'
import './styles/tokens.css'
import './ui/ui.css'
import './ui/legal.css'
import Background from './ui/Background'
import { Bagua, BrushFilters } from './ui/Bagua'
import Home from './ui/Home'
import AccountCard from './ui/AccountCard'
import { SoonPage } from './ui/Pages'
import { LegalFooter, MaintenancePage, PrivacyPage, TermsPage } from './ui/Legal'
import { fetchSiteStatus } from './ai'
import { useRealm } from './ui/fx'
import { useRoute } from './ui/route'
import TarotPage from './tarot/TarotPage'
import MeihuaPage from './meihua/ui/MeihuaPage'
import ZiweiPage from './ziwei/ui/ZiweiPage'

const TABS = [
  { path: '/', label: '首頁', icon: 'M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5' },
  { path: '/records', label: '紀錄', icon: 'M7 3h10v18H7zM10 8h4M10 12h4M10 16h2' },
  { path: '/accuracy', label: '準度', icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 11.2a.8.8 0 1 0 0 1.6a.8.8 0 0 0 0-1.6z' },
  { path: '/me', label: '我的', icon: 'M12 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM5 20c0-4 3-6 7-6s7 2 7 6' },
] as const

// 紫微頁跟「我的」是同一頁，亮「我的」；塔羅、梅花亮首頁
const tabOf = (path: string) => (path === '/ziwei' ? '/me' : ['/records', '/accuracy', '/me'].includes(path) ? path : '/')
// 塔羅、梅花右上角放回首頁鈕；紫微照設計稿放日期
const isMethodPage = (path: string) => ['/tarot', '/meihua'].includes(path)

// 其他網址（含舊的 #/qimen）一律導回首頁
const KNOWN_PATHS = ['/', '/tarot', '/meihua', '/ziwei', '/records', '/accuracy', '/me', '/privacy', '/terms']

function today() {
  const d = new Date()
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export default function MingliApp() {
  const route = useRoute()
  const realm = useRealm()
  const active = tabOf(route.path)
  // 維護狀態還沒回來前照常顯示；失敗時 fetchSiteStatus 自己回正常
  const [maintenance, setMaintenance] = useState(false)

  // effect 不可有回傳值：新版 Chrome 的 scrollTo 會回傳 Promise，被 React 當成 cleanup 會整棵卸掉
  useEffect(() => { window.scrollTo(0, 0) }, [route.hash])
  useEffect(() => {
    let alive = true
    fetchSiteStatus().then((s) => { if (alive) setMaintenance(s.maintenance) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!KNOWN_PATHS.includes(route.path)) location.replace('#/')
  }, [route.path])

  let page
  switch (route.path) {
    case '/tarot':
      page = <TarotPage seedParam={route.params.get('seed')} />
      break
    case '/meihua':
      page = <MeihuaPage params={route.params} />
      break
    case '/ziwei':
      page = <ZiweiPage params={route.params} />
      break
    case '/records':
      page = <SoonPage testid="ml-records" title="紀錄" line="問過的事和當時的判斷，會收在這裡。" />
      break
    case '/accuracy':
      page = <SoonPage testid="ml-accuracy" title="準度" line="之後能回頭對答案，看每種算法和實際發生的差多少。" />
      break
    case '/me':
      page = <><AccountCard /><ZiweiPage params={route.params} testid="ml-me" /></>
      break
    case '/privacy':
      page = <PrivacyPage />
      break
    case '/terms':
      page = <TermsPage />
      break
    default:
      page = <Home />
  }
  // 維護中整站只顯示維護頁；隱私與免責頁照樣能看
  const isLegalPath = route.path === '/privacy' || route.path === '/terms'
  if (maintenance && !isLegalPath) page = <MaintenancePage />

  return (
    <div className="ml-app" data-ml-realm={realm}>
      <Background />
      <Bagua />
      <BrushFilters />
      <header className="ml-header">
        <div className="ml-header-inner">
          <a className="ml-brand" href="#/">星墨</a>
          <nav className="ml-topnav" aria-label="主選單">
            {TABS.map((t) => (
              <a key={t.path} className="ml-tab" href={`#${t.path}`} aria-current={active === t.path ? 'page' : undefined}>{t.label}</a>
            ))}
          </nav>
          <div className="ml-header-end">
            {isMethodPage(route.path)
              ? <a className="ml-homebtn" href="#/">回首頁</a>
              : <span className="ml-date">{today()}</span>}
          </div>
        </div>
      </header>
      <main className="ml-main" key={route.hash}>{page}<LegalFooter /></main>
      <nav className="ml-tabbar" aria-label="底部分頁">
        {TABS.map((t) => (
          <a key={t.path} className="ml-tabbar-item" href={`#${t.path}`} aria-current={active === t.path ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={t.icon} /></svg>
            <span className="ml-tabbar-label">{t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
