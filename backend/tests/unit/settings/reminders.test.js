import { describe, expect, it } from 'vitest'
import { computeContributionSummary } from '../../../src/services/contributions/summary.js'
import { REMINDER_STATUSES, buildContributionReminders } from '../../../src/services/settings/reminders.js'

const MOHAMED = { id: 'u1', name: 'Mohamed Bakhoum', partnerNumber: 1 }
const CHEIKH = { id: 'u2', name: 'Cheikh Sow', partnerNumber: 2 }
const pay = (partner, amount, period, date = `${period}-05`) => ({ partner: partner.id, amount, period, contributionDate: date })

function reminders({ today = '2027-02-10', fundStartPeriod = '2026-12', contributions = [] } = {}) {
  return buildContributionReminders(computeContributionSummary({ today, fundStartPeriod, monthlyTarget: 15000, partners: [MOHAMED, CHEIKH], contributions }))
}
const row = (data, period, partner) => data.months.find((month) => month.period === period).partners.find((entry) => entry.partnerNumber === partner.partnerNumber)

describe('rappels de cotisation : mois affichés', () => {
  it('mois courant sans aucun versement : les deux associés « à compléter », reste = objectif', () => {
    const data = reminders({ today: '2026-12-20' })
    expect(data.available).toBe(true)
    expect(data.months.map((month) => month.period)).toEqual(['2026-12'])
    expect(data.months[0]).toMatchObject({ isCurrent: true, isOverdue: false, target: 30000, paid: 0, remaining: 30000, progressPercent: 0 })
    for (const partner of [MOHAMED, CHEIKH]) {
      expect(row(data, '2026-12', partner)).toMatchObject({ monthlyTarget: 15000, paid: 0, remaining: 15000, progressPercent: 0, status: REMINDER_STATUSES.TO_COMPLETE, period: '2026-12' })
    }
    expect(data.pendingCount).toBe(2)
  })

  it('mois précédents réellement impayés ou incomplets : courant d’abord, puis du plus récent au plus ancien', () => {
    const data = reminders({
      today: '2027-02-10',
      contributions: [pay(MOHAMED, 15000, '2026-12'), pay(CHEIKH, 15000, '2026-12'), pay(MOHAMED, 15000, '2027-01'), pay(CHEIKH, 5000, '2027-01')],
    })
    expect(data.months.map((month) => month.period)).toEqual(['2027-02', '2027-01']) // décembre est complet : aucun rappel
    expect(data.months[1]).toMatchObject({ isCurrent: false, isOverdue: true, paid: 20000, remaining: 10000 })
  })

  it('plusieurs mois en retard : ordre du plus récent au plus ancien après le mois courant', () => {
    const data = reminders({ today: '2027-03-02' })
    expect(data.months.map((month) => month.period)).toEqual(['2027-03', '2027-02', '2027-01', '2026-12'])
    expect(data.months.map((month) => month.isCurrent)).toEqual([true, false, false, false])
  })

  it('mois courant affiché même lorsque l’objectif est atteint (statut « atteint »)', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 15000, '2026-12'), pay(CHEIKH, 15000, '2026-12')] })
    expect(data.months).toHaveLength(1)
    expect(data.months[0].partners.every((entry) => entry.status === REMINDER_STATUSES.ACHIEVED)).toBe(true)
    expect(data.pendingCount).toBe(0)
  })

  it('un mois passé complet pour les deux n’est jamais rappelé', () => {
    const data = reminders({ today: '2027-01-10', contributions: [pay(MOHAMED, 15000, '2026-12'), pay(CHEIKH, 20000, '2026-12')] })
    expect(data.months.map((month) => month.period)).toEqual(['2027-01'])
  })

  it('situation des deux associés visible dans un mois en retard, même si un seul est en retard', () => {
    const data = reminders({ today: '2027-01-10', contributions: [pay(MOHAMED, 15000, '2026-12'), pay(CHEIKH, 3000, '2026-12')] })
    const december = data.months.find((month) => month.period === '2026-12')
    expect(december.partners.map((entry) => entry.partnerNumber)).toEqual([1, 2])
    expect(row(data, '2026-12', MOHAMED).status).toBe(REMINDER_STATUSES.ACHIEVED)
    expect(row(data, '2026-12', CHEIKH)).toMatchObject({ status: REMINDER_STATUSES.TO_COMPLETE, paid: 3000, remaining: 12000, progressPercent: 20 })
  })
})

describe('rappels de cotisation : montants et pourcentages', () => {
  it('additionne les versements multiples du même mois', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 5000, '2026-12', '2026-12-02'), pay(MOHAMED, 4000, '2026-12', '2026-12-09'), pay(MOHAMED, 3000, '2026-12', '2026-12-15')] })
    expect(row(data, '2026-12', MOHAMED)).toMatchObject({ paid: 12000, remaining: 3000, progressPercent: 80, status: REMINDER_STATUSES.TO_COMPLETE })
  })

  it('objectif atteint exactement : reste 0, 100 %, statut atteint', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 15000, '2026-12')] })
    expect(row(data, '2026-12', MOHAMED)).toMatchObject({ paid: 15000, remaining: 0, progressPercent: 100, status: REMINDER_STATUSES.ACHIEVED })
  })

  it('pourcentage plafonné à 100 % mais montant réellement versé JAMAIS plafonné', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 45000, '2026-12')] })
    expect(row(data, '2026-12', MOHAMED)).toMatchObject({ paid: 45000, remaining: 0, progressPercent: 100, status: REMINDER_STATUSES.ACHIEVED })
    expect(data.months[0].paid).toBe(45000) // total du mois réel
    expect(data.months[0].progressPercent).toBe(100)
  })

  it('un excédent d’un associé ne compense pas le retard de l’autre dans le mois', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 30000, '2026-12')] })
    expect(row(data, '2026-12', CHEIKH)).toMatchObject({ paid: 0, remaining: 15000, status: REMINDER_STATUSES.TO_COMPLETE })
    expect(data.months[0]).toMatchObject({ paid: 30000, remaining: 15000 }) // le reste du mois est celui de l’associé en retard
  })

  it('un versement très partiel donne un pourcentage à une décimale', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 1000, '2026-12')] })
    expect(row(data, '2026-12', MOHAMED).progressPercent).toBe(6.7)
  })
})

describe('rappels de cotisation : règles du fonds', () => {
  it('aucun rappel avant le début du fonds', () => {
    const data = reminders({ today: '2026-11-14' })
    expect(data.available).toBe(false)
    expect(data.months).toEqual([])
    expect(data.pendingCount).toBe(0)
    expect(data.unavailableReason).toMatch(/pas encore démarré/)
  })

  it('FUND_START_PERIOD absent : aucun rappel inventé, raison explicite', () => {
    const data = reminders({ today: '2026-12-20', fundStartPeriod: null })
    expect(data.available).toBe(false)
    expect(data.months).toEqual([])
    expect(data.unavailableReason).toMatch(/FUND_START_PERIOD/)
  })

  it('les cotisations d’avant le début du fonds ne créent ni rappel ni mois', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 15000, '2026-10')] })
    expect(data.months.map((month) => month.period)).toEqual(['2026-12'])
    expect(row(data, '2026-12', MOHAMED).paid).toBe(0)
  })

  it('une cotisation FUTURE (date après aujourd’hui) n’est jamais comptée', () => {
    const data = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 15000, '2026-12', '2026-12-28')] })
    expect(row(data, '2026-12', MOHAMED)).toMatchObject({ paid: 0, status: REMINDER_STATUSES.TO_COMPLETE })
  })

  it('le jour même compte, le lendemain non (frontière de date)', () => {
    const today = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 15000, '2026-12', '2026-12-20')] })
    const tomorrow = reminders({ today: '2026-12-20', contributions: [pay(MOHAMED, 15000, '2026-12', '2026-12-21')] })
    expect(row(today, '2026-12', MOHAMED).status).toBe(REMINDER_STATUSES.ACHIEVED)
    expect(row(tomorrow, '2026-12', MOHAMED).status).toBe(REMINDER_STATUSES.TO_COMPLETE)
  })

  it('aucun mois futur n’est jamais proposé', () => {
    const data = reminders({ today: '2026-12-31' })
    expect(data.months.map((month) => month.period)).toEqual(['2026-12'])
  })

  it('objectifs repris de la configuration : 15 000 par associé, 30 000 collectif', () => {
    const data = reminders({ today: '2026-12-20' })
    expect(data.monthlyTargetPerPartner).toBe(15000)
    expect(data.monthlyTargetCollective).toBe(30000)
    expect(data.fundStartPeriod).toBe('2026-12')
    expect(data.currentPeriod).toBe('2026-12')
  })

  it('l’identité de chaque associé est portée par chaque ligne', () => {
    const data = reminders({ today: '2026-12-20' })
    expect(data.months[0].partners.map(({ partnerId, name, partnerNumber }) => ({ partnerId, name, partnerNumber }))).toEqual([
      { partnerId: 'u1', name: 'Mohamed Bakhoum', partnerNumber: 1 },
      { partnerId: 'u2', name: 'Cheikh Sow', partnerNumber: 2 },
    ])
  })
})
