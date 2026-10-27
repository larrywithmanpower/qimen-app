import { useEffect } from 'react'
import { setRealm } from './fx'

// 聯絡信箱還沒給：上線前補上這個常數，頁面會自動改顯示信箱
export const CONTACT_EMAIL = ''

// 每一頁最底部的兩個連結（放在內容區最下方，不會被手機底部分頁列蓋住）
export function LegalFooter() {
  return (
    <footer className="ml-legal-foot">
      <a className="ml-legal-link" data-testid="ml-footer-privacy" href="#/privacy">隱私權</a>
      <a className="ml-legal-link" data-testid="ml-footer-terms" href="#/terms">免責聲明</a>
    </footer>
  )
}

type Section = { head: string; items: string[] }

function LegalPage({ testid, title, lead, sections }: { testid: string; title: string; lead: string; sections: Section[] }) {
  useEffect(() => { setRealm('east') }, [])
  return (
    <section className="ml-view ml-legal" data-testid={testid}>
      <h1 className="ml-page-title">{title}</h1>
      <p className="ml-page-line">{lead}</p>
      {sections.map((s) => (
        <div key={s.head} className="ml-legal-sec">
          <h2 className="ml-legal-head">{s.head}</h2>
          <ul className="ml-legal-list">
            {s.items.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      ))}
      <a className="ml-ghost" href="#/">回首頁</a>
    </section>
  )
}

const CONTACT_LINE = CONTACT_EMAIL
  ? `聯絡信箱：${CONTACT_EMAIL}（由語軒公司提供）`
  : '聯絡方式由語軒公司提供，聯絡信箱上線前補上。'

const PRIVACY_SECTIONS: Section[] = [
  {
    head: '你的生辰',
    items: [
      '你填的生辰只存在你自己的裝置，放在瀏覽器的本機儲存空間。',
      '生辰不會上傳到我們的伺服器。',
      '清除瀏覽器資料，本機的紀錄就會一起刪掉。',
    ],
  },
  {
    head: '送給 AI 的內容',
    items: [
      '送出去的只有排好的盤，和你輸入的問題。',
      '不含你的生日原文，也不含姓名。',
      'AI 解讀由 Anthropic 的 Claude 處理，經 Google Cloud 上的服務轉送。',
    ],
  },
  {
    head: '伺服器記什麼',
    items: [
      '每次呼叫只記 token 數、算法項目、成功或失敗的狀態、花了多久。',
      '不記你的問題，也不記盤面內容。',
    ],
  },
  {
    head: '第三方與追蹤',
    items: [
      '網站使用 Google Fonts 載入字型。',
      '沒有廣告，也沒有廣告追蹤。',
    ],
  },
  {
    head: '聯絡我們',
    items: [CONTACT_LINE],
  },
]

const TERMS_SECTIONS: Section[] = [
  {
    head: '內容性質',
    items: [
      '命理解讀的內容僅供參考，不保證預測結果。',
      '每段解讀都會附上依據的牌義、卦辭與星曜，讓你自己查證，但依據不等於結果一定如此。',
    ],
  },
  {
    head: '不能取代專業意見',
    items: [
      '這裡的內容不能取代醫療、法律、投資、心理諮商等專業意見。',
      '遇到這些事，請找有資格的專業人員。',
    ],
  },
  {
    head: '你的決定',
    items: ['依解讀做的任何決定，由你自己負責。'],
  },
  {
    head: '需要幫忙的時候',
    items: ['如果你正處在情緒危機，請撥 1925 安心專線，24 小時都有人接聽。'],
  },
]

export function PrivacyPage() {
  return (
    <LegalPage
      testid="ml-privacy"
      title="隱私權聲明"
      lead="我們只拿解讀需要的最少資料。以下是實際的做法。"
      sections={PRIVACY_SECTIONS}
    />
  )
}

export function TermsPage() {
  return (
    <LegalPage
      testid="ml-terms"
      title="免責聲明"
      lead="請在使用前先看過下面幾點。"
      sections={TERMS_SECTIONS}
    />
  )
}

export function MaintenancePage() {
  useEffect(() => { setRealm('east') }, [])
  return (
    <section className="ml-view ml-page" data-testid="ml-maintenance">
      <h1 className="ml-page-title">系統維護中</h1>
      <p className="ml-page-line">系統維護中，請稍後再來。</p>
    </section>
  )
}
