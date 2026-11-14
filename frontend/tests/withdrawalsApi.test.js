import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { ROUTES } from '../src/routes/routePaths'
import { withdrawalsApi } from '../src/services/withdrawalsApi'

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
const headerOf = (call, name) => Object.entries(call.init.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]

describe('service des retraits (API réelle, cookies HttpOnly)', () => {
  it('synthèse : GET /summary, cookies envoyés, aucun jeton manuel', async () => {
    const calls = stubFetch(() => respond(200, { data: { count: 2 } }))
    expect(await withdrawalsApi.summary()).toEqual({ count: 2 })
    expect(calls[0].url).toContain('/api/v1/withdrawals/summary')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.credentials).toBe('include')
    expect(/authorization|bearer/i.test(JSON.stringify(calls[0].init.headers))).toBe(false)
  })

  it('liste : paramètres exacts du backend, méta conservée', async () => {
    const meta = { page: 2, pageSize: 20, total: 45, totalPages: 3, filteredAmount: 900 }
    const calls = stubFetch(() => respond(200, { data: { withdrawals: [] }, meta }))
    const result = await withdrawalsApi.list({ search: 'café', beneficiaryId: 'a'.repeat(24), authorId: 'b'.repeat(24), from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: 2 })
    expect(result).toEqual({ data: { withdrawals: [] }, meta })
    const url = new URL(calls[0].url, 'http://x')
    expect(url.pathname).toBe('/api/v1/withdrawals')
    expect(Object.fromEntries(url.searchParams)).toEqual({ search: 'café', beneficiaryId: 'a'.repeat(24), authorId: 'b'.repeat(24), from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: '2', pageSize: '20' })
  })

  it('liste sans filtre : seuls tri, page et taille sont envoyés', async () => {
    const calls = stubFetch(() => respond(200, { data: { withdrawals: [] }, meta: {} }))
    await withdrawalsApi.list({ search: '', beneficiaryId: '', authorId: '', from: '', to: '', sort: 'date_desc', page: 1 })
    expect(calls[0].url).toContain('/api/v1/withdrawals?sort=date_desc&page=1&pageSize=20')
  })

  it("création : POST avec Idempotency-Key ; ni auteur ni solde dans le corps", async () => {
    const calls = stubFetch(() => respond(201, { data: { withdrawal: { id: 'w1' } } }))
    const payload = { beneficiaryId: 'a'.repeat(24), amount: 25000, withdrawalDate: '2026-12-18', reason: 'Loyer' }
    expect(await withdrawalsApi.create(payload, 'dc-key-12345678')).toEqual({ withdrawal: { id: 'w1' } })
    expect(calls[0].init.method).toBe('POST')
    expect(pathOf(calls[0])).toBe('/api/v1/withdrawals')
    expect(headerOf(calls[0], 'Idempotency-Key')).toBe('dc-key-12345678')
    expect(JSON.parse(calls[0].init.body)).toEqual(payload)
    expect(/recordedBy|authorId|balance/i.test(calls[0].init.body)).toBe(false)
  })

  it('modification : PATCH /:id avec les seuls champs modifiés ; détail : GET /:id encodé', async () => {
    const calls = stubFetch(() => respond(200, { data: { withdrawal: { id: 'w1' }, changed: true } }))
    await withdrawalsApi.update('w1', { amount: 5000 })
    expect(calls[0].init.method).toBe('PATCH')
    expect(pathOf(calls[0])).toBe('/api/v1/withdrawals/w1')
    expect(JSON.parse(calls[0].init.body)).toEqual({ amount: 5000 })
    await withdrawalsApi.get('../x?y')
    expect(calls[1].init.method).toBe('GET')
    expect(calls[1].url).not.toContain('../')
  })

  it('suppression : DELETE /:id (suppression logique), motif facultatif', async () => {
    const calls = stubFetch(() => respond(200, { data: { id: 'w1', deleted: true } }))
    expect(await withdrawalsApi.remove('w1', 'Doublon')).toEqual({ id: 'w1', deleted: true })
    expect(calls[0].init.method).toBe('DELETE')
    expect(JSON.parse(calls[0].init.body)).toEqual({ reason: 'Doublon' })
    await withdrawalsApi.remove('w2', null)
    expect(calls[1].init.body).toBe(undefined)
  })

  it('erreurs : code métier et statut conservés (trésorerie insuffisante) ; erreur réseau distincte', async () => {
    stubFetch(() => respond(409, { error: { code: 'INSUFFICIENT_TREASURY', message: 'Trésorerie insuffisante.' } }))
    await expect(withdrawalsApi.create({}, 'k-12345678')).rejects.toMatchObject({ status: 409, code: 'INSUFFICIENT_TREASURY' })
    stubFetch(() => respond(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalide.', fields: [{ field: 'amount', message: 'Trop faible.' }] } }))
    await expect(withdrawalsApi.create({}, 'k-12345678')).rejects.toMatchObject({ status: 400, fields: [{ field: 'amount', message: 'Trop faible.' }] })
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(withdrawalsApi.summary()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('session expirée : un seul renouvellement puis un seul rejeu', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('/api/auth/refresh')) return respond(200, { data: {} })
      return calls.filter((call) => call.url.includes('/api/v1/withdrawals')).length === 1 ? respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Expirée.' } }) : respond(200, { data: { count: 1 } })
    })
    expect(await withdrawalsApi.summary()).toEqual({ count: 1 })
    expect(calls.map(pathOf)).toEqual(['/api/v1/withdrawals/summary', '/api/auth/refresh', '/api/v1/withdrawals/summary'])
  })

  it("aucun jeton n'est stocké dans le navigateur par ce module", () => {
    for (const file of ['../src/services/withdrawalsApi.js', '../src/hooks/useWithdrawalsModule.js', '../src/pages/withdrawals/WithdrawalsPage.jsx']) {
      expect(/localStorage|sessionStorage|document\.cookie/.test(readFileSync(new URL(file, import.meta.url), 'utf8'))).toBe(false)
    }
  })
})

describe('navigation', () => {
  it('route /retraits et entrée « Retraits » ; routes existantes inchangées ; page protégée', () => {
    expect(ROUTES.WITHDRAWALS).toBe('/retraits')
    expect([ROUTES.DASHBOARD, ROUTES.CONTRIBUTIONS, ROUTES.ACTIVITIES, ROUTES.TREASURY]).toEqual(['/dashboard', '/cotisations', '/activites', '/tresorerie'])
    const nav = readFileSync(new URL('../src/constants/navigationItems.js', import.meta.url), 'utf8')
    expect(nav).toContain("label: 'Retraits', to: ROUTES.WITHDRAWALS")
    for (const kept of ["'Tableau de bord'", "'Cotisations'", "'Trésorerie'", "'Activités'", "'Historique'"]) expect(nav).toContain(kept)
    const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8')
    const guard = routes.indexOf('<RequireAuth />')
    expect(routes.indexOf('ROUTES.WITHDRAWALS')).toBeGreaterThan(guard)
    expect(routes.indexOf('path="*"')).toBeGreaterThan(routes.indexOf('ROUTES.WITHDRAWALS'))
  })
})
