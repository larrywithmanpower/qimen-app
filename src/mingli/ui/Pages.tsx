import { useEffect } from 'react'
import { setRealm } from './fx'
import { goTo } from './route'
import { session } from './session'

// 之後開放的空白頁：紀錄、準度
export function SoonPage({ title, line, testid }: { title: string; line: string; testid: string }) {
  useEffect(() => { setRealm('east') }, [])
  return (
    <section className="ml-view ml-page" data-testid={testid}>
      <h1 className="ml-page-title">{title}</h1>
      <p className="ml-page-line">{line}</p>
      <span className="ml-soon-pill">之後開放</span>
    </section>
  )
}

// 梅花、紫微、我的先放簡單佔位頁，下一批換成正式畫面
export function PlaceholderPage({ title, line, testid, showQuestion }: { title: string; line: string; testid: string; showQuestion?: boolean }) {
  useEffect(() => { setRealm('east') }, [])
  return (
    <section className="ml-view ml-page" data-testid={testid}>
      <h1 className="ml-page-title">{title}</h1>
      {showQuestion && session.question && <p className="ml-page-question">{session.question}</p>}
      <p className="ml-page-line">{line}</p>
      <button type="button" className="ml-ghost" onClick={() => goTo('/')}>回首頁</button>
    </section>
  )
}
