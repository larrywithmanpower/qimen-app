import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: virtual module
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

import { ThemeProvider } from './context/ThemeContext.tsx'
import { HistoryProvider } from './context/HistoryContext.tsx'
import { SituationProvider } from './context/SituationContext.tsx'
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <SituationProvider>
          <HistoryProvider>
            <App />
          </HistoryProvider>
        </SituationProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)
