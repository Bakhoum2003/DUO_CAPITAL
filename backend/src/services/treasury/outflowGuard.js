// 1. le solde (même calcul que la consultation : computeTreasury) est lu DANS la transaction de l'écriture ;
// 2. un document de verrou unique (TreasuryLock) est incrémenté en premier : deux sorties simultanées écrivent le même
//    document, MongoDB refuse l'une (conflit d'écriture) et la rejoue sur le solde déjà mis à jour ;
// 3. solde insuffisant : l'erreur est levée DANS la transaction, qui est annulée en entier : aucun enregistrement
//    partiel, aucun AuditLog, aucune incrémentation du verrou ;
// 4. le montant et la date sont contrôlés : entier > 0 ; date de sortie future refusée (le solde ne compte que le passé).
// Le `write` fourni par l'appelant crée l'enregistrement de la sortie ET son AuditLog avec la `dbSession` reçue.
// `preflight` (facultatif) s'exécute APRÈS le verrou et AVANT le contrôle du solde : il permet de rejouer une requête
// idempotente déjà terminée sans exiger à nouveau le solde (un rejeu ne doit jamais devenir « trésorerie insuffisante »).
// `runLocked` donne le même verrou et le même solde pour modifier ou supprimer une sortie existante.

import { AppError } from '../../utils/AppError.js'
import { todayInBusinessZone } from '../../utils/businessDates.js'
import { runInTransaction } from '../../utils/transaction.js'
import { isFcfaAmount, isBusinessDate } from '../../models/shared/validators.js'
import { TREASURY_LOCK_ID, TreasuryLock } from '../../models/TreasuryLock.js'

/**
 * @param {{ loadSources: (dbSession?: import('mongoose').ClientSession) => Promise<object>, computeBalance: (sources: object, today: string) => number, clock?: () => Date }} deps
 */
export function createOutflowGuard({ loadSources, computeBalance, clock = () => new Date() }) {
  return {
    /**
     * Exécute `write` seulement si `amount` FCFA sont réellement disponibles, de façon atomique.
     * @param {{ amount: number, date: string, write: (dbSession: import('mongoose').ClientSession, context: { balanceBefore: number }) => Promise<unknown>, preflight?: (dbSession: import('mongoose').ClientSession) => Promise<unknown> }} options
     */
    async runOutflow({ amount, date, write, preflight }) {
      if (!isFcfaAmount(amount) || amount < 1) {
        throw new AppError({ status: 422, code: 'INVALID_OUTFLOW_AMOUNT', message: 'Le montant doit être un nombre entier de FCFA strictement positif.' })
      }
      const today = todayInBusinessZone(clock())
      if (!isBusinessDate(date)) throw new AppError({ status: 422, code: 'INVALID_OUTFLOW_DATE', message: 'La date de la sortie est invalide.' })
      if (date > today) {
        throw new AppError({ status: 422, code: 'OUTFLOW_DATE_IN_FUTURE', message: "Une sortie d'argent ne peut pas être datée dans le futur : elle n'a pas encore eu lieu." })
      }

      return runLockedTransaction(async (dbSession, context) => {
        if (preflight) {
          const early = await preflight(dbSession)
          if (early !== undefined) return early
        }
        if (amount > context.balanceBefore) {
          throw new AppError({
            status: 409,
            code: 'INSUFFICIENT_TREASURY',
            message: `Trésorerie insuffisante : ${context.balanceBefore} FCFA disponibles, ${amount} FCFA demandés.`,
          })
        }
        // 3) Écriture de la sortie et de son audit, dans la même transaction.
        return write(dbSession, { balanceBefore: context.balanceBefore })
      })
    },

    /**
     * Modification / suppression d'une sortie existante : même verrou, même solde lu dans la transaction.
     * `work(dbSession, { balanceBefore, today })` fait ses propres contrôles et écritures (dont l'AuditLog).
     */
    runLocked(work) {
      return runLockedTransaction(work)
    },
  }

  // Le document de verrou existe avant toute transaction (création idempotente, sans montant) : deux premières sorties
  async function runLockedTransaction(work) {
    const today = todayInBusinessZone(clock())
    await TreasuryLock.updateOne({ _id: TREASURY_LOCK_ID }, { $setOnInsert: { version: 0 } }, { upsert: true })

    return runInTransaction(async (dbSession) => {
      // 1) Verrou : sérialise toutes les sorties (conflit d'écriture => rejeu automatique sur le solde à jour).
      await TreasuryLock.findOneAndUpdate({ _id: TREASURY_LOCK_ID }, { $inc: { version: 1 }, $set: { lastOutflowAt: new Date() } }, { upsert: true, session: dbSession })
      // 2) Solde lu après le verrou, dans la même transaction.
      const balanceBefore = computeBalance(await loadSources(dbSession), today)
      return work(dbSession, { balanceBefore, today })
    })
  }
}
