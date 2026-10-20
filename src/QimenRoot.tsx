import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { HistoryProvider } from './context/HistoryContext.tsx'
import { SituationProvider } from './context/SituationContext.tsx'
import { PhrasesProvider } from './context/PhrasesContext.tsx'
import { HelmetProvider } from 'react-helmet-async';

// 奇門舊 App 的 Provider 樹（原本寫在 main.tsx）
export default function QimenRoot() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <SituationProvider>
          <HistoryProvider>
            <PhrasesProvider>
              <App />
            </PhrasesProvider>
          </HistoryProvider>
        </SituationProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
