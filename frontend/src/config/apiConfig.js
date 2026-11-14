// Adresse du backend. Vide par défaut : les appels partent vers « /api/... » sur la même origine que le frontend.
// - En développement, Vite relaie « /api » vers le backend (voir vite.config.js) : pas de CORS, cookies sur une seule origine.
// - En production, définir VITE_API_BASE_URL (ex. https://api.exemple.com) ou servir le frontend et l'API sur le même domaine.
// Ce sont des adresses, jamais des secrets : tout ce qui commence par VITE_ est visible dans le navigateur.
export const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
