import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { pwaStore } from './pwa/defaultPwaStore'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { unsavedChangesStore } from './pwa/defaultUnsavedChangesStore'
import { attachBeforeUnloadGuard } from './pwa/unsavedChangesStore'
import './styles/index.css'

pwaStore.init()
attachBeforeUnloadGuard(unsavedChangesStore)
if (import.meta.env.PROD) registerServiceWorker(pwaStore)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
