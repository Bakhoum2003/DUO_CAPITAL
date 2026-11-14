import { describe, expect, it } from 'vitest'
import { ACTIVITY_STATUSES, allowedActions, nextStatus, TRANSITION_ACTIONS } from '../../../src/services/activities/rules.js'
import { toActivityView } from '../../../src/services/activityView.js'
import {
  completeActivitySchema, createActivitySchema, emptyActionSchema, listActivitiesQuerySchema, reopenActivitySchema, updateActivitySchema,
} from '../../../src/validation/activity.schemas.js'

describe('règles de statut', () => {
  it.each([
    ['ACTIVE', 'suspend', 'SUSPENDED'],
    ['SUSPENDED', 'reactivate', 'ACTIVE'],
    ['ACTIVE', 'complete', 'COMPLETED'],
    ['SUSPENDED', 'complete', 'COMPLETED'],
    ['COMPLETED', 'reopen', 'ACTIVE'],
    ['ACTIVE', 'archive', 'ARCHIVED'],
    ['SUSPENDED', 'archive', 'ARCHIVED'],
    ['COMPLETED', 'archive', 'ARCHIVED'],
  ])('%s + %s → %s', (from, action, to) => {
    expect(nextStatus(from, action)).toBe(to)
  })

  it.each([
    ['ACTIVE', 'reactivate'], ['ACTIVE', 'reopen'], ['SUSPENDED', 'suspend'], ['SUSPENDED', 'reopen'],
    ['COMPLETED', 'suspend'], ['COMPLETED', 'reactivate'], ['COMPLETED', 'complete'],
    ['ARCHIVED', 'suspend'], ['ARCHIVED', 'reactivate'], ['ARCHIVED', 'complete'], ['ARCHIVED', 'reopen'], ['ARCHIVED', 'archive'],
    ['ACTIVE', 'delete'],
  ])('refuse %s + %s', (from, action) => {
    expect(nextStatus(from, action)).toBeNull()
  })

  it('une activité terminée ne se réactive pas par « reactivate » : seule la réouverture motivée existe', () => {
    expect(nextStatus('COMPLETED', 'reactivate')).toBeNull()
    expect(allowedActions('COMPLETED')).toContain('reopen')
  })

  it('actions proposées par statut ; une archivée est figée ; aucune action de suppression', () => {
    expect(allowedActions('ACTIVE')).toEqual(['edit', 'suspend', 'complete', 'archive'])
    expect(allowedActions('SUSPENDED')).toEqual(['edit', 'reactivate', 'complete', 'archive'])
    expect(allowedActions('COMPLETED')).toEqual(['edit', 'reopen', 'archive'])
    expect(allowedActions('ARCHIVED')).toEqual([])
    expect(TRANSITION_ACTIONS.some((action) => /delete|remove/.test(action))).toBe(false)
    expect(ACTIVITY_STATUSES).toEqual(['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'])
  })
})

describe('validation des activités', () => {
  const valid = { name: '  Vente de pagnes ', startDate: '2026-12-10' }

  it('création valide : nom nettoyé, valeurs par défaut, statut actif', () => {
    const result = createActivitySchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ name: 'Vente de pagnes', description: '', category: null, endDate: null })
    expect(createActivitySchema.safeParse({ ...valid, status: 'ACTIVE', category: ' Textile ' }).data.category).toBe('Textile')
  })

  it.each([
    ['nom manquant', { name: undefined }],
    ['nom trop court', { name: 'A' }],
    ['nom trop long', { name: 'x'.repeat(101) }],
    ['description trop longue', { description: 'x'.repeat(1001) }],
    ['catégorie trop longue', { category: 'x'.repeat(61) }],
    ['date de démarrage manquante', { startDate: undefined }],
    ['date invalide', { startDate: '2026-02-30' }],
    ['fin avant le début', { endDate: '2026-12-01' }],
    ['statut interdit', { status: 'COMPLETED' }],
    ['champ inconnu createdBy', { createdBy: 'a'.repeat(24) }],
    ['champ financier', { amount: 5000 }],
    ['nom objet (injection)', { name: { $ne: null } }],
  ])('création refusée : %s', (_label, patch) => {
    expect(createActivitySchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })

  it('modification : partielle, vide refusée, statut et champs inconnus refusés', () => {
    expect(updateActivitySchema.safeParse({ description: 'Nouvelle' }).success).toBe(true)
    expect(updateActivitySchema.safeParse({ category: null }).data.category).toBeNull()
    expect(updateActivitySchema.safeParse({ endDate: null }).success).toBe(true)
    for (const bad of [{}, { status: 'ARCHIVED' }, { name: 'A' }, { createdBy: 'x' }, { totalInvested: 1 }, { startDate: '2026-12-10', endDate: '2026-12-01' }]) {
      expect(updateActivitySchema.safeParse(bad).success).toBe(false)
    }
  })

  it('actions : corps vide strict, date de fin facultative, motif de réouverture obligatoire', () => {
    expect(emptyActionSchema.safeParse({}).success).toBe(true)
    expect(emptyActionSchema.safeParse({ status: 'ACTIVE' }).success).toBe(false)
    expect(completeActivitySchema.safeParse({}).success).toBe(true)
    expect(completeActivitySchema.safeParse({ endDate: '2026-13-01' }).success).toBe(false)
    expect(reopenActivitySchema.safeParse({}).success).toBe(false)
    expect(reopenActivitySchema.safeParse({ reason: 'ab' }).success).toBe(false)
    expect(reopenActivitySchema.safeParse({ reason: 'Nouveau lot de marchandises' }).success).toBe(true)
  })

  it('filtres de liste : valeurs par défaut, bornes, paramètres inconnus ou malveillants refusés', () => {
    expect(listActivitiesQuerySchema.safeParse({}).data).toMatchObject({ sort: 'start_desc', page: 1, pageSize: 12 })
    expect(listActivitiesQuerySchema.safeParse({ page: '2', pageSize: '50', status: 'SUSPENDED', search: ' pagne ' }).data).toMatchObject({ page: 2, pageSize: 50, status: 'SUSPENDED', search: 'pagne' })
    for (const bad of [{ status: 'DELETED' }, { sort: 'x' }, { pageSize: '51' }, { page: '0' }, { search: 'x'.repeat(101) }, { foo: '1' }, { status: ['ACTIVE', 'ARCHIVED'] }]) {
      expect(listActivitiesQuerySchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe('représentation publique', () => {
  it('nomme les auteurs sans email ni secret et expose les actions permises', () => {
    const users = new Map([['u1', { name: 'Mohamed Bakhoum' }]])
    const view = toActivityView(
      { _id: 'a1', name: 'Pagnes', status: 'COMPLETED', startDate: '2026-12-10', endDate: '2026-12-30', createdBy: 'u1', reopenHistory: [{ reopenedAt: new Date('2026-12-31T00:00:00Z'), reopenedBy: 'u1', reason: 'Reprise', previousEndDate: '2026-12-30' }], passwordHash: 'secret' },
      users,
      { operationsCount: 3 },
    )
    expect(view.createdBy).toEqual({ id: 'u1', name: 'Mohamed Bakhoum' })
    expect(view.reopenHistory[0].reopenedBy.name).toBe('Mohamed Bakhoum')
    expect(view.allowedActions).toEqual(['edit', 'reopen', 'archive'])
    expect(view.operationsCount).toBe(3)
    expect(/secret|passwordHash|email/.test(JSON.stringify(view))).toBe(false)
  })
})
