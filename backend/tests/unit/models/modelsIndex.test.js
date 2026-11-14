import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import * as models from '../../../src/models/index.js'

const MODEL_NAMES = ['AuditLog', 'Business', 'BusinessOperation', 'Contribution', 'FundSettings', 'IdempotencyKey', 'Session', 'TreasuryLock', 'User', 'UserPreferences', 'Withdrawal']
const FINANCIAL = ['Contribution', 'BusinessOperation', 'Withdrawal']

describe('ensemble des modèles B1', () => {
  it('exporte exactement les 11 modèles (TreasuryLock en Phase F, FundSettings et UserPreferences en Phase Paramètres)', () => {
    expect(MODEL_NAMES.every((name) => typeof models[name]?.schema?.path === 'function')).toBe(true)
    expect(Object.keys(mongoose.models).sort()).toEqual(MODEL_NAMES)
  })

  it('charger les modèles n’ouvre aucune connexion (tests hors Atlas)', () => {
    expect(mongoose.connection.readyState).toBe(0)
    expect(process.env.DATABASE_URL).toBeUndefined()
  })

  it('refuse tout champ inconnu partout (strict: throw)', () => {
    for (const name of MODEL_NAMES) expect(models[name].schema.options.strict).toBe('throw')
  })

  it('les modèles financiers sont en suppression logique, auteur immuable et concurrence optimiste', () => {
    for (const name of FINANCIAL) {
      const { schema } = models[name]
      expect(schema.path('deletedAt')).toBeTruthy()
      expect(schema.path('deletedBy')).toBeTruthy()
      expect(schema.path('recordedBy').options.immutable).toBe(true)
      expect(schema.options.optimisticConcurrency).toBe(true)
    }
  })

  it('tous les montants sont des entiers FCFA : aucun champ Decimal ni flottant libre', () => {
    for (const name of FINANCIAL) {
      const amount = models[name].schema.path('amount')
      expect(amount.instance).toBe('Number')
      expect(amount.options.min[0]).toBe(1)
    }
  })

  it('les dates métier sont des chaînes AAAA-MM-JJ et les horodatages techniques des Date UTC', () => {
    expect(models.Contribution.schema.path('contributionDate').instance).toBe('String')
    expect(models.Withdrawal.schema.path('withdrawalDate').instance).toBe('String')
    expect(models.BusinessOperation.schema.path('operationDate').instance).toBe('String')
    expect(models.Business.schema.path('startDate').instance).toBe('String')
    expect(models.Contribution.schema.path('createdAt').instance).toBe('Date')
  })

  it('aucun modèle ne stocke de secret en clair', () => {
    for (const name of MODEL_NAMES) {
      const forbidden = ['password', 'refreshToken', 'token', 'secret'].filter((path) => models[name].schema.path(path))
      expect(forbidden).toEqual([])
    }
  })

  it('exporte les constantes et validateurs partagés', () => {
    expect(models.BUSINESS_STATUSES).toEqual(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'SUSPENDED']) // SUSPENDED ajouté en Phase E (les trois valeurs historiques sont inchangées)
    expect(models.BUSINESS_OPERATION_TYPES).toEqual(['INVESTMENT', 'EXPENSE', 'REVENUE'])
    expect(models.isFcfaAmount(1000)).toBe(true)
  })
})
