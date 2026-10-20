import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: virtual module
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// 奇門舊畫面保留在 #/qimen，首頁改為命理 App
const isQimen = location.hash.startsWith('#/qimen')
const QimenRoot = lazy(() => import('./QimenRoot.tsx'))
const MingliApp = lazy(() => import('./mingli/MingliApp.tsx'))

// 在兩個 App 之間切換時整頁重載，避免兩套全域樣式混在一起
addEventListener('hashchange', () => {
  if (location.hash.startsWith('#/qimen') !== isQimen) location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{isQimen ? <QimenRoot /> : <MingliApp />}</Suspense>
  </StrictMode>,
)
