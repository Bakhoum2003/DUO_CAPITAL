import { describe, expect, it } from 'vitest'
import {
  ACTION_META, STATUS_META, buildActionBody, buildActivitiesPath, buildCategoryOptions, buildCountCards, buildCreatePayload, buildUpdatePayload,
  canEdit, DEFAULT_FILTERS, describeActivityError, emptyFormValues, formatDateTime, formValuesFromActivity, getStatusMeta, hasActiveFilters,
  isRealDate, statusActionsOf, validateActionInput, validateActivityForm,
} from '../src/utils/activitiesViewModel'

const valid = { name: 'Vente de pagnes', description: 'Wax', category: 'Textile', startDate: '2026-12-10', endDate: '' }

describe('statuts', () => {
  it('quatre statuts distincts ; une activité suspendue n’est jamais « Terminée »', () => {
    expect(Object.keys(STATUS_META)).toEqual(['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'])
    expect(getStatusMeta('ACTIVE')).toEqual({ label: 'En cours', tone: 'success' })
    expect(getStatusMeta('SUSPENDED').label).toBe('Suspendue')
    expect(getStatusMeta('SUSPENDED').label).not.toBe(getStatusMeta('COMPLETED').label)
    expect(new Set(Object.values(STATUS_META).map((meta) => meta.tone)).size).toBe(4)
    expect(getStatusMeta('???').label).toBe('Statut inconnu')
  })
})

describe('filtres et adresse de la liste', () => {
  it('valeurs par défaut, filtres actifs, réinitialisation', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'ARCHIVED' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'name_asc', page: 3 })).toBe(false)
  })

  it('les caractères spéciaux de la recherche sont encodés', () => {
    const url = buildActivitiesPath({ ...DEFAULT_FILTERS, search: 'a&b=c #1' })
    expect(url).toContain('search=a%26b%3Dc+%231')
    expect(new URL(url, 'http://x').searchParams.get('search')).toBe('a&b=c #1')
  })

  it('compteurs : valeurs de l’API, « — » si absentes (jamais un faux 0)', () => {
    const cards = buildCountCards({ total: 5, ACTIVE: 2, SUSPENDED: 1, COMPLETED: 1, ARCHIVED: 1 })
    expect(cards.map((card) => [card.id, card.valueLabel])).toEqual([['total', '5'], ['ACTIVE', '2'], ['SUSPENDED', '1'], ['COMPLETED', '1'], ['ARCHIVED', '1']])
    expect(buildCountCards(undefined).every((card) => card.valueLabel === '—')).toBe(true)
    expect(buildCountCards({ total: 0, ACTIVE: 0, SUSPENDED: 0, COMPLETED: 0, ARCHIVED: 0 })[0].valueLabel).toBe('0')
  })

  it('options de catégorie : celles de l’API, la catégorie choisie reste sélectionnable', () => {
    expect(buildCategoryOptions(['Textile']).map((option) => option.value)).toEqual(['', 'Textile'])
    expect(buildCategoryOptions([], 'Ancienne').map((option) => option.value)).toEqual(['', 'Ancienne'])
    expect(buildCategoryOptions(undefined)).toHaveLength(1)
  })
})

describe('validation du formulaire', () => {
  it('formulaire valide : aucune erreur', () => {
    expect(validateActivityForm(valid)).toEqual({})
  })

  it.each([
    ['nom vide', { name: '   ' }, 'name'],
    ['nom trop court', { name: 'A' }, 'name'],
    ['nom trop long', { name: 'x'.repeat(101) }, 'name'],
    ['description trop longue', { description: 'x'.repeat(1001) }, 'description'],
    ['catégorie trop longue', { category: 'x'.repeat(61) }, 'category'],
    ['date manquante', { startDate: '' }, 'startDate'],
    ['date inexistante', { startDate: '2026-02-30' }, 'startDate'],
  ])('refuse : %s', (_label, patch, field) => {
    expect(Object.keys(validateActivityForm({ ...valid, ...patch }))).toContain(field)
  })

  it('date de fin : obligatoire si terminée, jamais avant le démarrage', () => {
    expect(validateActivityForm({ ...valid }, { showEndDate: true, requireEndDate: true }).endDate).toMatch(/date de fin/)
    expect(validateActivityForm({ ...valid, endDate: '2026-12-01' }, { showEndDate: true }).endDate).toMatch(/précéder/)
    expect(validateActivityForm({ ...valid, endDate: '2026-12-20' }, { showEndDate: true })).toEqual({})
    expect(validateActivityForm({ ...valid }, { showEndDate: false })).toEqual({})
  })

  it('isRealDate', () => {
    expect([isRealDate('2026-12-31'), isRealDate('2026-13-01'), isRealDate('2026-02-29'), isRealDate('2028-02-29'), isRealDate('hier'), isRealDate('')]).toEqual([true, false, false, true, false, false])
  })
})

describe('corps envoyés au backend', () => {
  it('création : champs autorisés seulement, nettoyés, catégorie vide → null', () => {
    const payload = buildCreatePayload({ ...valid, name: '  Pagnes ', category: '   ', description: ' x ' })
    expect(payload).toEqual({ name: 'Pagnes', description: 'x', category: null, startDate: '2026-12-10' })
    expect(Object.keys(payload).some((key) => ['status', 'createdBy', 'amount', 'endDate'].includes(key))).toBe(false)
  })

  it('modification : uniquement les champs changés ; rien de changé = objet vide', () => {
    const original = { name: 'Vente de pagnes', description: 'Wax', category: 'Textile', startDate: '2026-12-10', endDate: null }
    expect(buildUpdatePayload(formValuesFromActivity(original), original)).toEqual({})
    expect(buildUpdatePayload({ ...formValuesFromActivity(original), name: ' Nouveau ' }, original)).toEqual({ name: 'Nouveau' })
    expect(buildUpdatePayload({ ...formValuesFromActivity(original), category: '' }, original)).toEqual({ category: null })
    expect(buildUpdatePayload({ ...formValuesFromActivity(original), description: '' }, original)).toEqual({ description: '' })
  })

  it('la date de fin n’est envoyée que pour une activité terminée', () => {
    const original = { name: 'A B', description: '', category: null, startDate: '2026-12-10', endDate: '2026-12-18' }
    const values = { ...formValuesFromActivity(original), endDate: '2026-12-19' }
    expect(buildUpdatePayload(values, original)).toEqual({})
    expect(buildUpdatePayload(values, original, { showEndDate: true })).toEqual({ endDate: '2026-12-19' })
  })

  it('valeurs initiales', () => {
    expect(emptyFormValues('2026-12-20')).toEqual({ name: '', description: '', category: '', startDate: '2026-12-20', endDate: '' })
    expect(formValuesFromActivity({ name: 'A B', category: null, startDate: '2026-12-10', endDate: null }).category).toBe('')
  })
})

describe('actions de statut', () => {
  it('cinq actions, aucune suppression', () => {
    expect(Object.keys(ACTION_META)).toEqual(['suspend', 'reactivate', 'complete', 'reopen', 'archive'])
    expect(Object.keys(ACTION_META).some((action) => /delete|remove|suppr/i.test(action + ACTION_META[action].label))).toBe(false)
  })

  it('actions proposées = celles autorisées par le backend selon le statut', () => {
    expect(statusActionsOf({ allowedActions: ['edit', 'suspend', 'complete', 'archive'] })).toEqual(['suspend', 'complete', 'archive'])
    expect(statusActionsOf({ allowedActions: ['edit', 'reactivate', 'complete', 'archive'] })).toEqual(['reactivate', 'complete', 'archive'])
    expect(statusActionsOf({ allowedActions: ['edit', 'reopen', 'archive'] })).toEqual(['reopen', 'archive'])
    expect(statusActionsOf({ allowedActions: [] })).toEqual([])
    expect(statusActionsOf(null)).toEqual([])
    expect(canEdit({ allowedActions: [] })).toBe(false)
    expect(canEdit({ allowedActions: ['edit'] })).toBe(true)
  })

  it('réouverture : motif obligatoire ; clôture : date réelle, pas dans le futur, pas avant le démarrage', () => {
    const context = { startDate: '2026-12-10', todayIso: '2026-12-20' }
    expect(validateActionInput('reopen', { reason: '  ' }, context)).toMatch(/obligatoire/)
    expect(validateActionInput('reopen', { reason: 'ab' }, context)).toMatch(/obligatoire/)
    expect(validateActionInput('reopen', { reason: 'x'.repeat(301) }, context)).toMatch(/dépasser/)
    expect(validateActionInput('reopen', { reason: 'Nouveau lot' }, context)).toBeNull()
    expect(validateActionInput('complete', { endDate: '2026-12-21' }, context)).toMatch(/futur/)
    expect(validateActionInput('complete', { endDate: '2026-12-05' }, context)).toMatch(/précéder/)
    expect(validateActionInput('complete', { endDate: '2026-02-30' }, context)).toMatch(/invalide/)
    expect(validateActionInput('complete', { endDate: '2026-12-20' }, context)).toBeNull()
    expect(validateActionInput('complete', { endDate: '' }, context)).toBeNull()
    expect(validateActionInput('suspend', {}, context)).toBeNull()
  })

  it('corps des actions : vide, date de fin facultative, motif nettoyé', () => {
    expect(buildActionBody('suspend')).toEqual({})
    expect(buildActionBody('archive', { reason: 'ignoré' })).toEqual({})
    expect(buildActionBody('complete', { endDate: '' })).toEqual({})
    expect(buildActionBody('complete', { endDate: '2026-12-18' })).toEqual({ endDate: '2026-12-18' })
    expect(buildActionBody('reopen', { reason: ' Reprise ' })).toEqual({ reason: 'Reprise' })
  })
})

describe('erreurs du serveur', () => {
  it('erreurs par champ conservées, champs inconnus ignorés', () => {
    const result = describeActivityError({ code: 'VALIDATION_ERROR', message: 'Invalide.', fields: [{ field: 'name', message: 'Trop court.' }, { field: 'name', message: 'Doublon.' }, { field: 'createdBy', message: 'Interdit.' }] })
    expect(result.fieldErrors).toEqual({ name: 'Trop court.' })
    expect(result.message).toBe('Invalide.')
  })

  it.each([
    ['ACTIVITY_NAME_ALREADY_USED', /porte déjà ce nom/],
    ['ACTIVITY_NOT_FOUND', /n'existe pas/],
    ['ACTIVITY_ARCHIVED', /archivée/],
    ['INVALID_STATUS_TRANSITION', /pas possible/],
    ['START_DATE_AFTER_OPERATIONS', /première opération/],
    ['END_DATE_BEFORE_OPERATIONS', /dernière opération/],
    ['END_DATE_IN_FUTURE', /futur/],
    ['REOPEN_LIMIT_REACHED', /maximal/],
  ])('code métier %s traduit', (code, pattern) => {
    expect(describeActivityError({ code, message: 'brut' }).message).toMatch(pattern)
  })

  it('code inconnu : message du serveur ; sans message : message générique', () => {
    expect(describeActivityError({ code: 'AUTRE', message: 'Message serveur.' }).message).toBe('Message serveur.')
    expect(describeActivityError(undefined).message).toMatch(/Réessayez/)
  })
})

describe('dates', () => {
  it('date et heure affichées à Dakar', () => {
    expect(formatDateTime('2026-12-20T10:00:00.000Z')).toBe('20/12/2026 à 10:00')
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('pas une date')).toBe('—')
  })
})
