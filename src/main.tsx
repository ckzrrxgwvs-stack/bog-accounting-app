import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ComfortModeProvider } from './context/ComfortModeContext.tsx'
import { VisualPresetProvider } from './context/VisualPresetContext.tsx'
import { NavCustomizationProvider } from './context/NavCustomizationContext.tsx'
import './index.css'
import App from './App.tsx'

// One request on load so Network tab shows the API host (needs VITE_API_URL at Vercel build time).
const viteApiBase = import.meta.env.VITE_API_URL as string | undefined
if (viteApiBase && typeof window !== 'undefined') {
  const healthUrl = `${viteApiBase.replace(/\/$/, '')}/health`
  void fetch(healthUrl, { mode: 'cors', credentials: 'omit' }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ComfortModeProvider>
        <VisualPresetProvider>
          <NavCustomizationProvider>
            <App />
          </NavCustomizationProvider>
        </VisualPresetProvider>
      </ComfortModeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
