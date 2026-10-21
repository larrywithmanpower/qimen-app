import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: virtual module
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const MingliApp = lazy(() => import('./mingli/MingliApp.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <MingliApp />
    </Suspense>
  </StrictMode>,
)
