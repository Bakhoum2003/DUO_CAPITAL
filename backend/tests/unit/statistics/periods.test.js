import { describe, expect, it } from 'vitest'
import { todayInBusinessZone } from '../../../src/utils/businessDates.js'
import { STATISTICS_PERIOD_KEYS, addMonthsToDate, previousPeriodRange, resolveStatisticsRange } from '../../../src/services/statistics/periods.js'

const TODAY = '2026-12-20' // dimanche
const range = (period, extra = {}, today = TODAY) => resolveStatisticsRange({ period, ...extra }, today)
const bounds = (value) => ({ from: value.from, to: value.to })

describe('périodes des statistiques (bornes incluses, jamais d’avenir)', () => {
  it('liste officielle des périodes', () => {
    expect([...STATISTICS_PERIOD_KEYS]).toEqual(['week', 'month', 'last3months', 'last6months', 'year', 'all', 'custom'])
  })

  it('semaine : du lundi à aujourd’hui', () => expect(bounds(range('week'))).toEqual({ from: '2026-12-14', to: '2026-12-20' }))
  it('lundi : la semaine ne contient que ce jour', () => expect(bounds(range('week', {}, '2026-12-14'))).toEqual({ from: '2026-12-14', to: '2026-12-14' }))
  it('mois : du 1er à aujourd’hui (pas jusqu’à la fin du mois)', () => expect(bounds(range('month'))).toEqual({ from: '2026-12-01', to: '2026-12-20' }))
  it('année : du 1er janvier à aujourd’hui', () => expect(bounds(range('year'))).toEqual({ from: '2026-01-01', to: '2026-12-20' }))
  it('3 derniers mois : aujourd’hui − 3 mois + 1 jour', () => expect(bounds(range('last3months'))).toEqual({ from: '2026-09-21', to: '2026-12-20' }))
  it('6 derniers mois : aujourd’hui − 6 mois + 1 jour', () => expect(bounds(range('last6months'))).toEqual({ from: '2026-06-21', to: '2026-12-20' }))
  it('fin de mois : 31 mai − 3 mois = 28 février, donc départ le 1er mars', () => expect(bounds(range('last3months', {}, '2026-05-31'))).toEqual({ from: '2026-03-01', to: '2026-05-31' }))
  it('toute la période : sans début, jusqu’à aujourd’hui', () => expect(bounds(range('all'))).toEqual({ from: null, to: TODAY }))
  it('période par défaut : toute la période', () => expect(bounds(resolveStatisticsRange({}, TODAY))).toEqual({ from: null, to: TODAY }))

  it('personnalisée : bornes incluses telles que fournies', () => {
    const result = range('custom', { from: '2026-12-05', to: '2026-12-10' })
    expect(bounds(result)).toEqual({ from: '2026-12-05', to: '2026-12-10' })
    expect(result.isEmpty).toBe(false)
  })

  it('personnalisée dans le futur : fin plafonnée à aujourd’hui, fin demandée conservée', () => {
    const result = range('custom', { from: '2026-12-10', to: '2026-12-31' })
    expect(bounds(result)).toEqual({ from: '2026-12-10', to: TODAY })
    expect(result.requestedTo).toBe('2026-12-31')
  })

  it('personnalisée entièrement dans le futur : période vide', () => {
    expect(range('custom', { from: '2027-01-01', to: '2027-01-10' }).isEmpty).toBe(true)
  })

  it('libellés français', () => {
    expect(range('last3months').label).toBe('3 derniers mois')
    expect(range('all').label).toBe('Toute la période')
  })

  it('addMonthsToDate ramène le jour au dernier jour du mois', () => {
    expect(addMonthsToDate('2026-03-31', -1)).toBe('2026-02-28')
    expect(addMonthsToDate('2024-03-31', -1)).toBe('2024-02-29')
    expect(addMonthsToDate('2026-12-20', -12)).toBe('2025-12-20')
  })
})

describe('fuseau horaire Dakar (UTC+0 toute l’année)', () => {
  it('« aujourd’hui » bascule exactement à minuit heure de Dakar', () => {
    expect(todayInBusinessZone(new Date('2026-12-20T23:59:59.999Z'))).toBe('2026-12-20')
    expect(todayInBusinessZone(new Date('2026-12-21T00:00:00.000Z'))).toBe('2026-12-21')
  })
})

describe('période précédente équivalente', () => {
  const previous = (period, extra, today) => previousPeriodRange(range(period, extra, today))

  it('semaine : la semaine précédente, mêmes jours', () => expect(previous('week')).toEqual({ from: '2026-12-07', to: '2026-12-13' }))
  it('mois : mêmes jours écoulés du mois précédent', () => expect(previous('month')).toEqual({ from: '2026-11-01', to: '2026-11-20' }))
  it('mois : 31 du mois, jour ramené au dernier jour du mois précédent', () => expect(previous('month', {}, '2026-03-31')).toEqual({ from: '2026-02-01', to: '2026-02-28' }))
  it('année : mêmes jours écoulés de l’année précédente', () => expect(previous('year')).toEqual({ from: '2025-01-01', to: '2025-12-20' }))
  it('3 mois : même durée (91 jours) juste avant', () => expect(previous('last3months')).toEqual({ from: '2026-06-22', to: '2026-09-20' }))
  it('personnalisée : même durée juste avant le début', () => expect(previous('custom', { from: '2026-12-10', to: '2026-12-14' })).toEqual({ from: '2026-12-05', to: '2026-12-09' }))
  it('aucune comparaison pour « toute la période »', () => expect(previous('all')).toBeNull())
  it('aucune comparaison pour une période vide', () => expect(previous('custom', { from: '2027-01-01', to: '2027-01-05' })).toBeNull())
})
