import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { dashboardReducer, initialDashboardState } from '../src/hooks/dashboardState'
import { ROUTES } from '../src/routes/routePaths'
import { historyApi } from '../src/services/historyApi'

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
const pathOf = (call) => new URL(call.url, 'http://x').pathname
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe("service de l'Historique (API réelle, cookies HttpOnly, lecture seule)", () => {
  it('synthèse : GET /summary, cookies envoyés, aucun jeton manuel', async () => {
    const calls = stubFetch(() => respond(200, { data: { totals: { net: 45000 } } }))
    expect(await historyApi.summary()).toEqual({ totals: { net: 45000 } })
    expect(calls[0].url).toContain('/api/v1/history/summary')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.credentials).toBe('include')
    expect(/authorization|bearer/i.test(JSON.stringify(calls[0].init.headers))).toBe(false)
  })

  it('liste : paramètres exacts du backend, méta de pagination conservée', async () => {
    const meta = { page: 2, limit: 50, total: 120, totalPages: 3, filtered: { count: 120, inflow: 1, outflow: 2, net: -1 } }
    const calls = stubFetch(() => respond(200, { data: { operations: [] }, meta }))
    const result = await historyApi.list({ search: 'café', type: 'EXPENSE', direction: 'OUT', partnerId: 'a'.repeat(24), activityId: 'none', period: 'custom', from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: 2, limit: 50 })
    expect(result).toEqual({ data: { operations: [] }, meta })
    const url = new URL(calls[0].url, 'http://x')
    expect(url.pathname).toBe('/api/v1/history')
    expect(Object.fromEntries(url.searchParams)).toEqual({ search: 'café', type: 'EXPENSE', direction: 'OUT', partnerId: 'a'.repeat(24), activityId: 'none', period: 'custom', from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: '2', limit: '50' })
  })

  it('liste sans filtre : seuls tri, page et limite sont envoyés', async () => {
    const calls = stubFetch(() => respond(200, { data: { operations: [] }, meta: {} }))
    await historyApi.list({ search: '', type: '', direction: '', partnerId: '', activityId: '', period: 'all', from: '', to: '', sort: 'date_desc', page: 1, limit: 20 })
    expect(calls[0].url).toContain('/api/v1/history?sort=date_desc&page=1&limit=20')
  })

  it('détail : GET /:type/:id avec segments encodés', async () => {
    const calls = stubFetch(() => respond(200, { data: { operation: { id: 'o1' } } }))
    expect(await historyApi.detail('WITHDRAWAL', 'o1')).toEqual({ operation: { id: 'o1' } })
    expect(pathOf(calls[0])).toBe('/api/v1/history/WITHDRAWAL/o1')
    await historyApi.detail('EXPENSE', '../x?y')
    expect(calls[1].url).not.toContain('../')
  })

  it("lecture seule : aucune méthode d'écriture n'existe et toutes les requêtes sont des GET", async () => {
    expect(Object.keys(historyApi).sort()).toEqual(['detail', 'list', 'summary'])
    const calls = stubFetch(() => respond(200, { data: {}, meta: {} }))
    await historyApi.summary()
    await historyApi.list({})
    await historyApi.detail('EXPENSE', 'x')
    expect(calls.every((call) => call.init.method === 'GET')).toBe(true)
  })

  it('erreurs : code métier et statut conservés ; erreur réseau distincte', async () => {
    stubFetch(() => respond(404, { error: { code: 'MOVEMENT_NOT_FOUND', message: 'Introuvable.' } }))
    await expect(historyApi.detail('EXPENSE', 'x')).rejects.toMatchObject({ status: 404, code: 'MOVEMENT_NOT_FOUND' })
    stubFetch(() => respond(500, { error: { code: 'INTERNAL_ERROR', message: 'Erreur.' } }))
    await expect(historyApi.summary()).rejects.toMatchObject({ status: 500 })
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(historyApi.summary()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('session expirée : un seul renouvellement puis un seul rejeu', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('/api/auth/refresh')) return respond(200, { data: {} })
      return calls.filter((call) => call.url.includes('/api/v1/history')).length === 1 ? respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Expirée.' } }) : respond(200, { data: { totals: {} } })
    })
    expect(await historyApi.summary()).toEqual({ totals: {} })
    expect(calls.map(pathOf)).toEqual(['/api/v1/history/summary', '/api/auth/refresh', '/api/v1/history/summary'])
  })
})

describe("états de chargement et absence de données fictives", () => {
  it("une erreur n'efface pas les dernières données valides et ne les remplace par rien de local", () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    expect(state.status).toBe('loading')
    expect(state.data).toBeNull()
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { totals: { net: 45000 } } })
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    expect(state.status).toBe('refreshing')
    state = dashboardReducer(state, { type: 'failure', requestId: 2, message: 'Erreur API' })
    expect(state).toMatchObject({ status: 'error', errorMessage: 'Erreur API', data: { totals: { net: 45000 } } })
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { totals: { net: 1 } } }) // réponse périmée
    expect(state.data).toEqual({ totals: { net: 45000 } })
  })

  it('première lecture en échec : aucune donnée (jamais de valeur de démonstration)', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    state = dashboardReducer(state, { type: 'failure', requestId: 1, message: 'Erreur API' })
    expect(state.data).toBeNull()
  })

  it("la page, le hook et le service n'utilisent ni données de démonstration ni stockage navigateur", () => {
    for (const file of ['../src/pages/history/HistoryPage.jsx', '../src/hooks/useHistory.js', '../src/hooks/useOperationDetail.js', '../src/services/historyApi.js', '../src/utils/historyViewModel.js']) {
      const text = source(file)
      expect(/mock|localStorage|sessionStorage|document\.cookie/i.test(text)).toBe(false)
      expect(/businessService|contributionsService|historyService/.test(text)).toBe(false)
    }
  })
})

describe('navigation', () => {
  it('route /historique protégée et entrée de menu « Historique » conservées', () => {
    expect(ROUTES.HISTORY).toBe('/historique')
    const nav = source('../src/constants/navigationItems.js')
    expect(nav).toContain("label: 'Historique', to: ROUTES.HISTORY")
    const routes = source('../src/routes/AppRoutes.jsx')
    expect(routes.indexOf('ROUTES.HISTORY')).toBeGreaterThan(routes.indexOf('<RequireAuth />'))
    expect(routes.indexOf('path="*"')).toBeGreaterThan(routes.indexOf('ROUTES.HISTORY'))
    expect(routes).toContain('HistoryPage')
  })
})
