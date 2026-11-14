/**
 * Remplaçant de « virtual:pwa-register » pour `npm run dev` : le service worker n'existe qu'en production
 * (devOptions.enabled = false), l'enregistrement est donc volontairement sans effet.
 * Même signature que le module réel : registerSW(options) retourne la fonction de mise à jour.
 * Utilisé uniquement via l'alias défini dans vite.config.js ; la compilation de production utilise le vrai module.
 */
export function registerSW() {
  return async () => {}
}
