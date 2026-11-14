import { describe, expect, it } from 'vitest'
import { createContributionSchema, listContributionsQuerySchema } from '../../../src/validation/contribution.schemas.js'
import { hashCreateRequest } from '../../../src/services/contributions/requestHash.js'

const valid = { partnerId: 'a'.repeat(24), amount: 15000, contributionDate: '2026-12-05', period: '2026-12' }
const parse = (patch) => createContributionSchema.safeParse({ ...valid, ...patch })

describe('validation de la création', () => {
  it('accepte une demande valide, y compris au-dessus de 15 000 FCFA', () => {
    expect(parse({}).success).toBe(true)
    expect(parse({ amount: 20000 }).data.amount).toBe(20000)
    expect(parse({}).data.confirmDuplicate).toBe(false)
    expect(parse({ note: '   ' }).data.note).toBeNull()
  })

  it.each([
    ['montant nul', { amount: 0 }],
    ['montant négatif', { amount: -5 }],
    ['montant décimal', { amount: 100.5 }],
    ['montant texte', { amount: '15000' }],
    ['montant NaN', { amount: Number.NaN }],
    ['montant infini', { amount: Infinity }],
    ['date invalide', { contributionDate: '2026-02-30' }],
    ['date mal formée', { contributionDate: '5/12/2026' }],
    ['mois invalide', { period: '2026-13' }],
    ['associé invalide', { partnerId: 'pas-un-id' }],
    ['associé objet (injection)', { partnerId: { $ne: null } }],
    ['note trop longue', { note: 'x'.repeat(301) }],
    ['champ interdit recordedBy', { recordedBy: 'a'.repeat(24) }],
    ['champ interdit deletedAt', { deletedAt: null }],
  ])('refuse : %s', (_label, patch) => {
    expect(parse(patch).success).toBe(false)
  })

  it('refuse un associé manquant', () => {
    const { partnerId: _omit, ...rest } = valid
    expect(createContributionSchema.safeParse(rest).success).toBe(false)
  })

  it('l\'empreinte de demande dépend du contenu métier, pas de la confirmation', () => {
    expect(hashCreateRequest(valid)).toBe(hashCreateRequest({ ...valid, confirmDuplicate: true }))
    expect(hashCreateRequest(valid)).not.toBe(hashCreateRequest({ ...valid, amount: 15001 }))
  })
})

describe('validation des filtres', () => {
  const parseQuery = (query) => listContributionsQuerySchema.safeParse(query)
  it('valeurs par défaut de pagination', () => {
    expect(parseQuery({}).data).toMatchObject({ page: 1, pageSize: 20 })
  })
  it('convertit les nombres de la chaîne de requête', () => {
    expect(parseQuery({ page: '2', pageSize: '50' }).data).toMatchObject({ page: 2, pageSize: 50 })
  })
  it.each([
    [{ pageSize: '101' }], [{ page: '0' }], [{ page: 'abc' }], [{ period: '2026-1' }], [{ year: '1999' }],
    [{ from: '2026-12-10', to: '2026-12-01' }], [{ partnerId: 'x' }], [{ unknown: '1' }], [{ partnerId: ['a', 'b'] }],
  ])('refuse %j', (query) => {
    expect(parseQuery(query).success).toBe(false)
  })
})
