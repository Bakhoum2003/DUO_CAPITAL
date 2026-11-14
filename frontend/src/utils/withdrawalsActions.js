// Actions d'écriture du module Retraits (PURES : sans React), testables seules.
// - création : même promesse tant que l'envoi est en cours (une seule requête), même clé d'idempotence tant que le
//   contenu est identique (nouvelle tentative après coupure réseau = le serveur rejoue la réponse) ;
// - modification / suppression : une seule opération à la fois ;
// - rien n'est considéré comme fait avant la confirmation du serveur ; après un succès, les données affichées sont relues.

import { generateIdempotencyKey } from './contributionSubmitter'
import { buildCreatePayload, buildUpdatePayload, describeWithdrawalError } from './withdrawalsViewModel'

export const IDLE_MUTATION = Object.freeze({ status: 'idle', message: '', fieldErrors: {} })
const NO_CHANGE_MESSAGE = 'Aucune modification à enregistrer.'

const fingerprintOf = (payload) => JSON.stringify([payload.beneficiaryId, payload.amount, payload.withdrawalDate, payload.reason ?? null])

/**
 * @param {object} deps
 * @param {{ create: Function, update: Function, remove: Function }} deps.api
 * @param {(state: object) => void} deps.setMutation état de l'écriture en cours (idle / submitting / error)
 * @param {() => void} deps.refresh relit synthèse, liste (et donc solde) après un succès
 * @param {() => string} [deps.generateKey]
 */
export function createWithdrawalActions({ api, setMutation, refresh, generateKey = generateIdempotencyKey }) {
  let busy = false
  let creation = null // { key, fingerprint, promise }

  async function guarded(run) {
    if (busy) return { ok: false, ignored: true }
    busy = true
    setMutation({ ...IDLE_MUTATION, status: 'submitting' })
    try {
      const result = await run()
      setMutation(IDLE_MUTATION)
      refresh()
      return { ok: true, ...result }
    } catch (error) {
      setMutation({ status: 'error', ...describeWithdrawalError(error) })
      return { ok: false, error }
    } finally {
      busy = false
    }
  }

  return {
    isBusy: () => busy,

    /** @param {{ beneficiaryId: string, amount: string, withdrawalDate: string, reason: string }} values valeurs du formulaire (déjà contrôlées) */
    create(values) {
      const payload = buildCreatePayload(values)
      const fingerprint = fingerprintOf(payload)
      if (!creation || creation.fingerprint !== fingerprint) creation = { key: generateKey(), fingerprint }
      const { key } = creation
      return guarded(async () => {
        const data = await api.create(payload, key)
        creation = null // enregistré : un retrait identique ensuite sera un NOUVEAU retrait
        return { withdrawal: data.withdrawal }
      })
    },

    update(id, values, original) {
      const changes = buildUpdatePayload(values, original)
      if (Object.keys(changes).length === 0) {
        setMutation({ status: 'error', message: NO_CHANGE_MESSAGE, fieldErrors: {} })
        return Promise.resolve({ ok: false, noChange: true })
      }
      return guarded(async () => {
        const data = await api.update(id, changes)
        return { withdrawal: data.withdrawal }
      })
    },

    remove(id, reason) {
      return guarded(async () => {
        await api.remove(id, String(reason ?? '').trim() || null)
        return {}
      })
    },
  }
}
