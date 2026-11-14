import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { dashboardReducer, initialDashboardState } from '../src/hooks/dashboardState'
import { ROUTES } from '../src/routes/routePaths'
import { treasuryApi } from '../src/services/treasuryApi'

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

describe('service de la trésorerie (API réelle, cookies HttpOnly, lecture seule)', () => {
  it('synthèse : GET /summary, cookies envoyés, aucun jeton manuel', async () => {
    const calls = stubFetch(() => respond(200, { data: { balance: 45000 } }))
    expect(await treasuryApi.summary()).toEqual({ balance: 45000 })
    expect(calls[0].url).toContain('/api/v1/treasury/summary')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.credentials).toBe('include')
    expect(/authorization|bearer/i.test(JSON.stringify(calls[0].init.headers))).toBe(false)
  })

  it('historique : paramètres exacts du backend, meta de pagination conservée', async () => {
    const meta = { page: 2, pageSize: 20, total: 45, totalPages: 3, categories: ['Textile'], filtered: { count: 45, inflow: 1, outflow: 2, net: -1 } }
    const calls = stubFetch(() => respond(200, { data: { movements: [] }, meta }))
    const result = await treasuryApi.movements({ search: 'café', type: 'EXPENSE', direction: 'OUT', category: 'Textile', partnerId: 'a'.repeat(24), from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: 2 })
    expect(result).toEqual({ data: { movements: [] }, meta })
    const url = new URL(calls[0].url, 'http://x')
    expect(url.pathname).toBe('/api/v1/treasury/movements')
    expect(Object.fromEntries(url.searchParams)).toEqual({ search: 'café', type: 'EXPENSE', direction: 'OUT', category: 'Textile', partnerId: 'a'.repeat(24), from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: '2', pageSize: '20' })
  })

  it('historique sans filtre : seuls tri, page et taille sont envoyés', async () => {
    const calls = stubFetch(() => respond(200, { data: { movements: [] }, meta: {} }))
    await treasuryApi.movements({ search: '', type: '', direction: '', category: '', partnerId: '', from: '', to: '', sort: 'date_desc', page: 1 })
    expect(calls[0].url).toContain('/api/v1/treasury/movements?sort=date_desc&page=1&pageSize=20')
  })

  it('détail : GET /movements/:type/:id avec segments encodés', async () => {
    const calls = stubFetch(() => respond(200, { data: { movement: { id: 'm1' } } }))
    expect(await treasuryApi.movement('WITHDRAWAL', 'm1')).toEqual({ movement: { id: 'm1' } })
    expect(pathOf(calls[0])).toBe('/api/v1/treasury/movements/WITHDRAWAL/m1')
    await treasuryApi.movement('EXPENSE', '../x?y')
    expect(calls[1].url).not.toContain('../')
  })

  it("lecture seule : aucune méthode d'écriture n'existe et toutes les requêtes sont des GET", async () => {
    expect(Object.keys(treasuryApi).sort()).toEqual(['movement', 'movements', 'summary'])
    const calls = stubFetch(() => respond(200, { data: {}, meta: {} }))
    await treasuryApi.summary()
    await treasuryApi.movements({})
    await treasuryApi.movement('EXPENSE', 'x')
    expect(calls.every((call) => call.init.method === 'GET')).toBe(true)
  })

  it('erreurs : code métier et statut conservés ; erreur réseau distincte ; aucune donnée de remplacement', async () => {
    stubFetch(() => respond(404, { error: { code: 'MOVEMENT_NOT_FOUND', message: 'Introuvable.' } }))
    await expect(treasuryApi.movement('EXPENSE', 'x')).rejects.toMatchObject({ status: 404, code: 'MOVEMENT_NOT_FOUND' })
    stubFetch(() => respond(500, { error: { code: 'INTERNAL_ERROR', message: 'Erreur.' } }))
    await expect(treasuryApi.summary()).rejects.toMatchObject({ status: 500 })
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(treasuryApi.summary()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('session expirée : un seul renouvellement puis un seul rejeu ; refresh refusé = 401 propagée (session perdue)', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('/api/auth/refresh')) return respond(200, { data: {} })
      return calls.filter((call) => call.url.includes('/api/v1/treasury')).length === 1 ? respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Expirée.' } }) : respond(200, { data: { balance: 1 } })
    })
    expect(await treasuryApi.summary()).toEqual({ balance: 1 })
    expect(calls.map(pathOf)).toEqual(['/api/v1/treasury/summary', '/api/auth/refresh', '/api/v1/treasury/summary'])

    stubFetch((url) => respond(401, { error: { code: url.includes('refresh') ? 'REFRESH_TOKEN_INVALID' : 'UNAUTHENTICATED', message: 'Non.' } }))
    await expect(treasuryApi.summary()).rejects.toMatchObject({ status: 401 })
  })
})

describe('chargement : réducteur partagé et protection des données', () => {
  it("une erreur n'efface pas les dernières données valides et ne les remplace par rien de local", () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    expect(state.status).toBe('loading')
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { balance: 45000 } })
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    expect(state.status).toBe('refreshing')
    state = dashboardReducer(state, { type: 'failure', requestId: 2, message: 'Erreur API' })
    expect(state).toMatchObject({ status: 'error', errorMessage: 'Erreur API', data: { balance: 45000 } })
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { balance: 1 } }) // réponse périmée
    expect(state.data).toEqual({ balance: 45000 })
  })
})

describe('navigation', () => {
  it('route /tresorerie et entrée de menu « Trésorerie », distinctes des routes existantes', () => {
    expect(ROUTES.TREASURY).toBe('/tresorerie')
    const taken = Object.entries(ROUTES).filter(([name]) => name !== 'TREASURY').map(([, path]) => path)
    expect(taken.includes(ROUTES.TREASURY)).toBe(false)
    expect([ROUTES.DASHBOARD, ROUTES.CONTRIBUTIONS, ROUTES.ACTIVITIES]).toEqual(['/dashboard', '/cotisations', '/activites'])
    const nav = readFileSync(new URL('../src/constants/navigationItems.js', import.meta.url), 'utf8')
    expect(nav).toContain("label: 'Trésorerie', to: ROUTES.TREASURY")
    for (const kept of ["'Tableau de bord'", "'Cotisations'", "'Activités'", "'Historique'"]) expect(nav).toContain(kept)
  })

  it('la page est dans les routes protégées (sous RequireAuth), avant la redirection générale', () => {
    const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8')
    const guard = routes.indexOf('<RequireAuth />')
    const page = routes.indexOf('ROUTES.TREASURY')
    const fallback = routes.indexOf('path="*"')
    expect(guard).toBeGreaterThan(-1)
    expect(page).toBeGreaterThan(guard)
    expect(fallback).toBeGreaterThan(page)
  })
})
