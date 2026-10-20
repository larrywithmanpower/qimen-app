import { useEffect } from 'react'
import './styles/tokens.css'
import './ui/ui.css'
import Background from './ui/Background'
import { Bagua, BrushFilters } from './ui/Bagua'
import Home from './ui/Home'
import { SoonPage } from './ui/Pages'
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

// 首頁分頁在首頁與三個算法頁都亮
const tabOf = (path: string) => (['/records', '/accuracy', '/me'].includes(path) ? path : '/')
const isMethodPage = (path: string) => ['/tarot', '/meihua', '/ziwei'].includes(path)

function today() {
  const d = new Date()
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export default function MingliApp() {
  const route = useRoute()
  const realm = useRealm()
  const active = tabOf(route.path)

  useEffect(() => window.scrollTo(0, 0), [route.hash])

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
      page = <SoonPage testid="ml-accuracy" title="準度" line="對答案之後，這裡會算出每種算法準不準。" />
      break
    case '/me':
      page = <ZiweiPage params={route.params} testid="ml-me" />
      break
    default:
      page = <Home />
  }

  return (
    <div className="ml-app" data-ml-realm={realm}>
      <Background />
      <Bagua />
      <BrushFilters />
      <header className="ml-header">
        <div className="ml-header-inner">
          <a className="ml-brand" href="#/">命理</a>
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
      <main className="ml-main" key={route.hash}>{page}</main>
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
