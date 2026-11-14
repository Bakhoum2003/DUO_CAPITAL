// Envoi d'une cotisation SANS double soumission.
// - un clic répété pendant l'envoi retourne la même promesse : une seule requête part ;
// - la clé d'idempotence reste la même tant que le contenu est identique (nouvelle tentative après coupure réseau
//   = le serveur rejoue la réponse au lieu de créer un second versement) et change dès que le contenu change ;
// - rien n'est considéré comme enregistré avant la confirmation du serveur.

export function generateIdempotencyKey() {
  return `dc-${globalThis.crypto.randomUUID()}`
}

const fingerprintOf = (payload) => JSON.stringify([payload.partnerId, payload.amount, payload.contributionDate, payload.period, payload.note ?? null])

/**
 * @param {{ create: (payload: object, key: string) => Promise<object>, generateKey?: () => string }} deps
 * @returns {{ submit: (payload: object) => Promise<{ ok: true, contribution: object } | { ok: false, error: unknown }>, isSubmitting: () => boolean }}
 */
export function createContributionSubmitter({ create, generateKey = generateIdempotencyKey }) {
  let inFlight = null
  let key = null
  let fingerprint = null

  return {
    isSubmitting: () => inFlight !== null,
    submit(payload) {
      if (inFlight) return inFlight

      const current = fingerprintOf(payload)
      if (!key || current !== fingerprint) {
        key = generateKey()
        fingerprint = current
      }

      inFlight = create(payload, key)
        .then(
          (data) => {
            key = null // enregistré : le prochain versement identique sera un NOUVEAU versement
            fingerprint = null
            return { ok: true, contribution: data.contribution }
          },
          (error) => ({ ok: false, error }),
        )
        .finally(() => {
          inFlight = null
        })
      return inFlight
    },
  }
}
