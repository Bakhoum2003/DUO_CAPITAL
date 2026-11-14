import { describe, expect, it } from 'vitest'
import {
  addDays, addMonths, isValidDate, isValidPeriod, lastDayOfMonth, monthsBetween, resolvePeriodRange, startOfWeek, todayInBusinessZone,
} from '../../../src/utils/businessDates.js'
import { dashboardQuerySchema } from '../../../src/validation/dashboard.schemas.js'

const TODAY = '2026-11-14' // samedi

describe('dates métier', () => {
  it('« aujourd\'hui » suit Africa/Dakar', () => {
    expect(todayInBusinessZone(new Date('2026-11-14T23:30:00Z'))).toBe('2026-11-14')
    expect(todayInBusinessZone(new Date('2026-11-15T00:30:00Z'))).toBe('2026-11-15')
  })

  it('valide les dates et les périodes', () => {
    expect(isValidDate('2026-02-28')).toBe(true)
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-2-3')).toBe(false)
    expect(isValidPeriod('2026-12')).toBe(true)
    expect(isValidPeriod('2026-13')).toBe(false)
  })

  it('calcule les mois et les jours sans décalage', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addMonths('2026-11', 3)).toBe('2027-02')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthsBetween('2026-09', '2026-11')).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(monthsBetween('2026-11', '2026-09')).toEqual([])
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29')
    expect(startOfWeek(TODAY)).toBe('2026-11-09')
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09')
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09')
  })
})

describe('filtres de période', () => {
  it.each([
    ['today', { from: TODAY, to: TODAY }],
    ['week', { from: '2026-11-09', to: '2026-11-15' }],
    ['month', { from: '2026-11-01', to: '2026-11-30' }],
    ['quarter', { from: '2026-10-01', to: '2026-12-31' }],
    ['year', { from: '2026-01-01', to: '2026-12-31' }],
    ['all', { from: null, to: TODAY }],
  ])('%s', (period, expected) => {
    const range = resolvePeriodRange({ period }, TODAY)
    expect([range.from, range.to, range.key]).toEqual([expected.from, expected.to, period])
    expect(range.label).toBeTruthy()
  })

  it('période personnalisée : les dates fournies', () => {
    const range = resolvePeriodRange({ period: 'custom', from: '2026-03-01', to: '2026-03-31' }, TODAY)
    expect([range.from, range.to]).toEqual(['2026-03-01', '2026-03-31'])
  })

  it('trimestres : premier trimestre et début d\'année', () => {
    expect(resolvePeriodRange({ period: 'quarter' }, '2026-02-10')).toMatchObject({ from: '2026-01-01', to: '2026-03-31' })
  })
})

describe('paramètres de la requête dashboard', () => {
  const parse = (query) => dashboardQuerySchema.safeParse(query)

  it('« all » par défaut', () => {
    expect(parse({}).data.period).toBe('all')
  })

  it('refuse une période inconnue, des champs inconnus (dont un numéro d\'associé) et des dates sans « custom »', () => {
    expect(parse({ period: 'decade' }).success).toBe(false)
    expect(parse({ partnerNumber: '2' }).success).toBe(false)
    expect(parse({ period: 'month', from: '2026-01-01' }).success).toBe(false)
  })

  it('« custom » exige des dates valides, ordonnées et bornées', () => {
    expect(parse({ period: 'custom' }).success).toBe(false)
    expect(parse({ period: 'custom', from: '2026-02-30', to: '2026-03-01' }).success).toBe(false)
    expect(parse({ period: 'custom', from: '2026-03-02', to: '2026-03-01' }).success).toBe(false)
    expect(parse({ period: 'custom', from: '2000-01-01', to: '2026-03-01' }).success).toBe(false)
    expect(parse({ period: 'custom', from: '2026-03-01', to: '2026-03-31' }).success).toBe(true)
  })
})
