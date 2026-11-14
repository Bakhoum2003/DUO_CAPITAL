import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { pwaStore } from './pwa/defaultPwaStore'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import './styles/index.css'

// PWA : suivi de la connexion et de l'invitation d'installation ; le service worker n'est enregistré qu'en production.
pwaStore.init()
if (import.meta.env.PROD) registerServiceWorker(pwaStore)

// Thème et format des montants viennent des préférences de l'associé connecté (serveur) :
// ils sont appliqués par PreferencesProvider avant l'affichage des pages connectées. Rien n'est lu dans le navigateur.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
