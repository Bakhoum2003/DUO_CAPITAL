import { describe, expect, it } from 'vitest'
import { statisticsQuerySchema } from '../../../src/validation/statistics.schemas.js'

const parse = (query) => statisticsQuerySchema.safeParse(query)
const fails = (query) => parse(query).success === false

describe('paramètres de GET /statistics', () => {
  it('sans paramètre : toute la période', () => {
    const result = parse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ period: 'all' })
  })

  it('accepte chaque période prédéfinie', () => {
    for (const period of ['week', 'month', 'last3months', 'last6months', 'year', 'all']) expect(parse({ period }).success).toBe(true)
  })

  it('période personnalisée valide', () => {
    expect(parse({ period: 'custom', from: '2026-12-01', to: '2026-12-31' }).success).toBe(true)
    expect(parse({ period: 'custom', from: '2026-12-10', to: '2026-12-10' }).success).toBe(true)
  })

  it('refuse une période inconnue (y compris celles du Dashboard)', () => {
    expect(fails({ period: 'quarter' })).toBe(true)
    expect(fails({ period: '3months' })).toBe(true)
    expect(fails({ period: 'hier' })).toBe(true)
  })

  it('refuse les dates invalides ou impossibles', () => {
    expect(fails({ period: 'custom', from: '2026-02-30', to: '2026-03-05' })).toBe(true)
    expect(fails({ period: 'custom', from: '12/2026', to: '2026-12-31' })).toBe(true)
    expect(fails({ period: 'custom', from: '2026-12-01', to: 'demain' })).toBe(true)
  })

  it('« custom » exige les deux dates, dans l’ordre', () => {
    expect(fails({ period: 'custom' })).toBe(true)
    expect(fails({ period: 'custom', from: '2026-12-01' })).toBe(true)
    expect(fails({ period: 'custom', to: '2026-12-01' })).toBe(true)
    expect(fails({ period: 'custom', from: '2026-12-10', to: '2026-12-01' })).toBe(true)
  })

  it('from et to refusés hors « custom »', () => {
    expect(fails({ period: 'month', from: '2026-12-01' })).toBe(true)
    expect(fails({ from: '2026-12-01', to: '2026-12-31' })).toBe(true)
  })

  it('paramètre inconnu ou répété refusé', () => {
    expect(fails({ period: 'month', admin: '1' })).toBe(true)
    expect(fails({ period: ['week', 'month'] })).toBe(true)
  })

  it('période personnalisée limitée à 10 ans', () => {
    expect(fails({ period: 'custom', from: '2000-01-01', to: '2026-01-01' })).toBe(true)
  })
})
