import { describe, expect, it } from 'vitest'
import { computeContributionSummary } from '../../../src/services/contributions/summary.js'

const MOHAMED = { id: 'u1', name: 'Mohamed Bakhoum', partnerNumber: 1 }
const CHEIKH = { id: 'u2', name: 'Cheikh Sow', partnerNumber: 2 }
const pay = (partner, amount, period, date = `${period}-05`) => ({ partner, amount, period, contributionDate: date })

function summary({ today = '2027-02-10', fundStartPeriod = '2026-12', contributions = [] } = {}) {
  return computeContributionSummary({ today, fundStartPeriod, monthlyTarget: 15000, partners: [MOHAMED, CHEIKH], contributions })
}

describe('statistiques des cotisations', () => {
  it('avant le démarrage du fonds : aucun mois dû, aucun retard, aucun taux inventé', () => {
    const data = summary({ today: '2026-11-14' })
    expect(data.fundStarted).toBe(false)
    expect(data.monthsCount).toBe(0)
    expect(data.collective.expected).toBe(0)
    expect(data.collective.realizationRate).toBeNull()
    expect(data.partners[0].overdueMonths).toEqual([])
    expect(data.months).toEqual([])
  })

  it('mois futurs jamais dus ; mois courant non réglé = en cours, pas en retard', () => {
    const data = summary({ today: '2026-12-20' })
    expect(data.monthsCount).toBe(1)
    expect(data.months[0]).toMatchObject({ period: '2026-12', isCurrent: true, isOverdue: false, target: 30000 })
    expect(data.partners[0].overdueMonths).toEqual([])
    expect(data.partners[0].remaining).toBe(15000)
  })

  it('un mois passé non réglé est en retard', () => {
    const data = summary({ contributions: [pay('u1', 15000, '2026-12')] })
    expect(data.monthsCount).toBe(3)
    expect(data.partners[0].overdueMonths).toEqual(['2027-01'])
    expect(data.partners[1].overdueMonths).toEqual(['2026-12', '2027-01'])
  })

  it('montant réel conservé : 20 000 versés = 20 000 encaissés, excédent visible', () => {
    const data = summary({ today: '2026-12-20', contributions: [pay('u1', 20000, '2026-12')] })
    expect(data.partners[0].paid).toBe(20000)
    expect(data.partners[0].settled).toBe(15000)
    expect(data.partners[0].excess).toBe(5000)
    expect(data.partners[0].remaining).toBe(0)
    expect(data.collective.paid).toBe(20000)
  })

  it("l'excédent d'un mois ne compense pas un autre mois", () => {
    const data = summary({ today: '2027-01-20', contributions: [pay('u1', 45000, '2026-12')] })
    expect(data.partners[0]).toMatchObject({ paid: 45000, settled: 15000, remaining: 15000, excess: 30000, paidMonths: 1, unpaidMonths: 1 })
    expect(data.months[1].partners[0]).toMatchObject({ paid: 0, status: 'UNPAID' })
  })

  it('versements fractionnés sur un même mois : additionnés, tous comptés', () => {
    const data = summary({ today: '2026-12-20', contributions: [pay('u2', 5000, '2026-12'), pay('u2', 5000, '2026-12', '2026-12-12'), pay('u2', 5000, '2026-12', '2026-12-18')] })
    expect(data.partners[1]).toMatchObject({ paid: 15000, settled: 15000, paidMonths: 1, contributionsCount: 3 })
    expect(data.months[0].partners[1].status).toBe('PAID')
  })

  it('versement partiel', () => {
    const data = summary({ today: '2026-12-20', contributions: [pay('u1', 9000, '2026-12')] })
    expect(data.partners[0]).toMatchObject({ partialMonths: 1, paidMonths: 0, remaining: 6000, realizationRate: 60 })
  })

  it('totaux collectifs : cumul réel, objectif, restant, taux global', () => {
    const data = summary({ today: '2026-12-20', contributions: [pay('u1', 15000, '2026-12'), pay('u2', 6000, '2026-12')] })
    expect(data.collective).toMatchObject({ paid: 21000, objective: 30000, settled: 21000, remaining: 9000, realizationRate: 70, contributionsCount: 2 })
    expect(data.monthlyTargetCollective).toBe(30000)
  })

  it('sans FUND_START_PERIOD : rien d\'attendu inventé, versements réels affichés', () => {
    const data = summary({ fundStartPeriod: null, contributions: [pay('u1', 15000, '2026-12')] })
    expect(data.expectedAvailable).toBe(false)
    expect(data.collective.expected).toBeNull()
    expect(data.partners[0].remaining).toBeNull()
    expect(data.collective.paid).toBe(15000)
    expect(data.unavailableReason).toBeTruthy()
  })

  it('un versement hors des mois dus reste dans le total réel mais pas dans la conformité', () => {
    const data = summary({ today: '2026-12-20', contributions: [pay('u1', 15000, '2026-10')] })
    expect(data.partners[0]).toMatchObject({ paid: 15000, paidForDueMonths: 0, paidOutsideDueMonths: 15000, remaining: 15000 })
  })

  it('un versement daté après aujourd\'hui est ignoré ; un associé inconnu aussi', () => {
    const data = summary({ today: '2026-12-20', contributions: [pay('u1', 15000, '2026-12', '2027-01-05'), pay('ghost', 15000, '2026-12')] })
    expect(data.collective.paid).toBe(0)
  })
})
