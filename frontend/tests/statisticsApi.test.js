import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { dashboardReducer, initialDashboardState } from '../src/hooks/dashboardState'
import { ROUTES } from '../src/routes/routePaths'
import { statisticsApi } from '../src/services/statisticsApi'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
const respond = (status, body) => ({ ok: status < 300, status, json: async () => body })
function stubFetch(handler) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return handler(url, init)
  }
  return calls
}
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const params = (call) => Object.fromEntries(new URL(call.url, 'http://x').searchParams)
const pathOf = (call) => new URL(call.url, 'http://x').pathname

describe('service des Statistiques (API réelle, cookies HttpOnly, lecture seule)', () => {
  it('GET /api/v1/statistics : cookies envoyés, aucun jeton manuel', async () => {
    const calls = stubFetch(() => respond(200, { data: { totals: { netBalance: 45000 } } }))
    expect(await statisticsApi.get({ periodKey: 'all' })).toEqual({ totals: { netBalance: 45000 } })
    expect(pathOf(calls[0])).toBe('/api/v1/statistics')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.credentials).toBe('include')
    expect(/authorization|bearer/i.test(JSON.stringify(calls[0].init.headers))).toBe(false)
  })

  it('les périodes de l’interface sont transmises avec les clés de l’API', async () => {
    const calls = stubFetch(() => respond(200, { data: {} }))
    for (const periodKey of ['week', 'month', '3months', '6months', 'year', 'all']) await statisticsApi.get({ periodKey })
    expect(calls.map((call) => params(call).period)).toEqual(['week', 'month', 'last3months', 'last6months', 'year', 'all'])
    expect(calls.every((call) => !('from' in params(call)) && !('to' in params(call)))).toBe(true)
  })

  it('période personnalisée : dates de début et de fin transmises', async () => {
    const calls = stubFetch(() => respond(200, { data: {} }))
    await statisticsApi.get({ periodKey: 'custom', customStartDate: '2026-12-01', customEndDate: '2026-12-31' })
    expect(params(calls[0])).toEqual({ period: 'custom', from: '2026-12-01', to: '2026-12-31' })
  })

  it('lecture seule : une seule méthode, uniquement des GET', async () => {
    expect(Object.keys(statisticsApi)).toEqual(['get'])
    const calls = stubFetch(() => respond(200, { data: {} }))
    await statisticsApi.get({ periodKey: 'month' })
    expect(calls.every((call) => call.init.method === 'GET')).toBe(true)
  })

  it('erreurs : code métier et statut conservés ; erreur réseau distincte', async () => {
    stubFetch(() => respond(400, { error: { code: 'VALIDATION_ERROR', message: 'Période invalide.' } }))
    await expect(statisticsApi.get({ periodKey: 'custom', customStartDate: '2026-12-10', customEndDate: '2026-12-01' })).rejects.toMatchObject({ status: 400 })
    stubFetch(() => respond(500, { error: { code: 'INTERNAL_ERROR', message: 'Erreur.' } }))
    await expect(statisticsApi.get({ periodKey: 'all' })).rejects.toMatchObject({ status: 500 })
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(statisticsApi.get({ periodKey: 'all' })).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('session expirée : un seul renouvellement puis un seul rejeu', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('/api/auth/refresh')) return respond(200, { data: {} })
      return calls.filter((call) => call.url.includes('/api/v1/statistics')).length === 1 ? respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Expirée.' } }) : respond(200, { data: { totals: {} } })
    })
    expect(await statisticsApi.get({ periodKey: 'month' })).toEqual({ totals: {} })
    expect(calls.map(pathOf)).toEqual(['/api/v1/statistics', '/api/auth/refresh', '/api/v1/statistics'])
  })
})

describe('états de chargement : réponses obsolètes et erreurs', () => {
  it('changements rapides de période : seule la dernière réponse est retenue', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    state = dashboardReducer(state, { type: 'success', requestId: 2, data: { key: 'B', payload: 'période B' } })
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { key: 'A', payload: 'période A' } }) // arrive en retard
    expect(state.data).toEqual({ key: 'B', payload: 'période B' })
    expect(state.status).toBe('ready')
  })

  it('une erreur périmée ne remplace pas la réponse valide', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    state = dashboardReducer(state, { type: 'success', requestId: 2, data: { key: 'B', payload: 'ok' } })
    state = dashboardReducer(state, { type: 'failure', requestId: 1, message: 'Erreur ancienne' })
    expect(state.status).toBe('ready')
  })

  it('première lecture en échec : aucune donnée (jamais de valeur de démonstration)', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    state = dashboardReducer(state, { type: 'failure', requestId: 1, message: 'Erreur API' })
    expect(state).toMatchObject({ status: 'error', data: null, errorMessage: 'Erreur API' })
  })
})

describe('plus aucune donnée fictive dans la page Statistiques', () => {
  it('la page, le hook, le service et l’adaptateur n’utilisent ni données de démonstration ni stockage navigateur', () => {
    for (const file of ['../src/pages/statistics/StatisticsPage.jsx', '../src/hooks/useStatistics.js', '../src/services/statisticsApi.js', '../src/utils/statisticsViewModel.js']) {
      const text = source(file)
      expect(/mock|localStorage|sessionStorage|document\.cookie/i.test(text)).toBe(false)
      expect(/businessService|historyService|contributionsService|statisticsService|buildHistoryEntries/.test(text)).toBe(false)
    }
  })

  it('route /statistiques protégée et entrée de menu conservées', () => {
    expect(ROUTES.STATISTICS).toBe('/statistiques')
    expect(source('../src/constants/navigationItems.js')).toContain('ROUTES.STATISTICS')
    const routes = source('../src/routes/AppRoutes.jsx')
    expect(routes.indexOf('ROUTES.STATISTICS')).toBeGreaterThan(routes.indexOf('<RequireAuth />'))
    expect(routes).toContain('StatisticsPage')
  })
})
