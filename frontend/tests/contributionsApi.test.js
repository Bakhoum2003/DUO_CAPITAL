import { afterEach, describe, expect, it } from 'vitest'
import { contributionsApi } from '../src/services/contributionsApi'

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

describe('service des cotisations (API réelle, cookies HttpOnly)', () => {
  it('liste : cookies envoyés, aucun jeton manuel, meta de pagination conservée', async () => {
    const calls = stubFetch(() => respond(200, { data: { contributions: [] }, meta: { total: 0, page: 1 } }))
    const result = await contributionsApi.list({ partnerId: 'p1', page: 2 })
    expect(result).toEqual({ data: { contributions: [] }, meta: { total: 0, page: 1 } })
    expect(calls[0].url).toContain('/api/v1/contributions?partnerId=p1&page=2&pageSize=20')
    expect(calls[0].init.credentials).toBe('include')
    expect(/authorization|bearer/i.test(JSON.stringify(calls[0].init.headers))).toBe(false)
  })

  it('création : POST JSON avec Idempotency-Key, montant numérique, sans identité d\'auteur', async () => {
    const calls = stubFetch(() => respond(201, { data: { contribution: { id: 'c1' } } }))
    const data = await contributionsApi.create({ partnerId: 'p1', amount: 20000, contributionDate: '2026-12-05', period: '2026-12' }, 'cle-test-0003')
    expect(data).toEqual({ contribution: { id: 'c1' } })
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.headers['Idempotency-Key']).toBe('cle-test-0003')
    const body = JSON.parse(calls[0].init.body)
    expect(body.amount).toBe(20000)
    expect('recordedBy' in body).toBe(false)
  })

  it('statistiques : GET /summary', async () => {
    const calls = stubFetch(() => respond(200, { data: { monthsCount: 0 } }))
    expect(await contributionsApi.summary()).toEqual({ monthsCount: 0 })
    expect(calls[0].url).toContain('/api/v1/contributions/summary')
  })

  it('erreur API : ApiError avec code et champs ; panne réseau : NETWORK_ERROR', async () => {
    stubFetch(() => respond(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalide', fields: [{ field: 'amount', message: 'Montant invalide' }] } }))
    const error = await contributionsApi.create({}, 'cle-test-0004').catch((caught) => caught)
    expect([error.status, error.code, error.fields[0].field]).toEqual([400, 'VALIDATION_ERROR', 'amount'])

    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    const network = await contributionsApi.summary().catch((caught) => caught)
    expect(network.code).toBe('NETWORK_ERROR')
  })
})
