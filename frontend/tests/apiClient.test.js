import { describe, expect, it } from 'vitest'
import { ApiError, createApiClient } from '../src/services/apiClient'

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const ok = (data) => json(200, { data })
const fail = (status, code, message = 'Erreur') => json(status, { error: { code, message } })

function fakeFetch(routes) {
  const calls = []
  const queues = Object.fromEntries(Object.entries(routes).map(([path, list]) => [path, [...list]]))
  const impl = async (url, init) => {
    calls.push({ url, init })
    const queue = queues[url]
    if (!queue || queue.length === 0) throw new Error(`appel inattendu : ${url}`)
    const next = queue.length > 1 ? queue.shift() : queue[0]
    if (next instanceof Error) throw next
    return next
  }
  return { impl, calls, paths: () => calls.map((call) => call.url) }
}

const noLock = (task) => task()

describe('client HTTP : requêtes', () => {
  it('envoie les cookies (credentials: include), du JSON, et jamais de jeton dans les en-têtes', async () => {
    const { impl, calls } = fakeFetch({ '/api/x': [ok({ a: 1 })] })
    const client = createApiClient({ fetchImpl: impl, withRefreshLock: noLock })

    const data = await client.request('/api/x', { method: 'POST', body: { email: 'a@b.sn' } })

    expect(data).toEqual({ a: 1 })
    expect(calls[0].init.credentials).toBe('include')
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.headers['Content-Type']).toBe('application/json')
    expect(calls[0].init.body).toBe(JSON.stringify({ email: 'a@b.sn' }))
    expect(Object.keys(calls[0].init.headers).map((h) => h.toLowerCase())).not.toContain('authorization')
  })

  it('transmet des en-têtes supplémentaires (Idempotency-Key) et peut retourner meta', async () => {
    const spy = fakeFetch({ '/api/x': [json(200, { data: { a: 1 }, meta: { total: 3 } })] })
    const client = createApiClient({ fetchImpl: spy.impl, withRefreshLock: noLock })

    const result = await client.request('/api/x', { headers: { 'Idempotency-Key': 'cle-de-test-0001' }, withMeta: true })

    expect(result).toEqual({ data: { a: 1 }, meta: { total: 3 } })
    expect(spy.calls[0].init.headers['Idempotency-Key']).toBe('cle-de-test-0001')
    expect(spy.calls[0].init.headers.Accept).toBe('application/json')
  })

  it("préfixe l'adresse avec baseUrl", async () => {
    const { impl, paths } = fakeFetch({ 'https://api.test/api/x': [ok(null)] })
    await createApiClient({ baseUrl: 'https://api.test', fetchImpl: impl, withRefreshLock: noLock }).request('/api/x')
    expect(paths()).toEqual(['https://api.test/api/x'])
  })

  it("transforme une erreur du serveur en ApiError (statut, code, message, champs)", async () => {
    const response = json(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalide', fields: [{ field: 'email', message: 'x' }] } })
    const { impl } = fakeFetch({ '/api/x': [response] })
    const client = createApiClient({ fetchImpl: impl, withRefreshLock: noLock })

    const error = await client.request('/api/x').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect([error.status, error.code, error.message]).toEqual([400, 'VALIDATION_ERROR', 'Invalide'])
    expect(error.fields).toEqual([{ field: 'email', message: 'x' }])
  })

  it('signale une panne réseau avec le code NETWORK_ERROR', async () => {
    const { impl } = fakeFetch({ '/api/x': [new TypeError('Failed to fetch')] })
    const error = await createApiClient({ fetchImpl: impl, withRefreshLock: noLock }).request('/api/x').catch((e) => e)
    expect([error.status, error.code]).toEqual([0, 'NETWORK_ERROR'])
  })

  it('gère une réponse non JSON', async () => {
    const impl = async () => ({ ok: false, status: 502, json: async () => { throw new Error('html') } })
    const error = await createApiClient({ fetchImpl: impl, withRefreshLock: noLock }).request('/api/x').catch((e) => e)
    expect([error.status, error.code]).toEqual([502, 'HTTP_ERROR'])
  })
})

describe('client HTTP : renouvellement de session', () => {
  it.each(['UNAUTHENTICATED', 'TOKEN_EXPIRED'])('401 %s : un renouvellement, puis la requête est rejouée une fois', async (code) => {
    const { impl, paths } = fakeFetch({
      '/api/auth/me': [fail(401, code), ok({ user: { name: 'Mohamed Bakhoum' } })],
      '/api/auth/refresh': [ok({ user: {} })],
    })
    const client = createApiClient({ fetchImpl: impl, withRefreshLock: noLock })

    const data = await client.request('/api/auth/me')

    expect(data.user.name).toBe('Mohamed Bakhoum')
    expect(paths()).toEqual(['/api/auth/me', '/api/auth/refresh', '/api/auth/me'])
  })

  it('appelle le renouvellement en POST, sans corps ni jeton (le cookie HttpOnly part tout seul)', async () => {
    const { impl, calls } = fakeFetch({
      '/api/x': [fail(401, 'UNAUTHENTICATED'), ok(1)],
      '/api/auth/refresh': [ok({})],
    })
    await createApiClient({ fetchImpl: impl, withRefreshLock: noLock }).request('/api/x')
    const refresh = calls[1]
    expect(refresh.init.method).toBe('POST')
    expect(refresh.init.credentials).toBe('include')
    expect(refresh.init.body).toBeUndefined()
  })

  it('renouvellement refusé (401) : erreur, pas de rejeu, session perdue signalée', async () => {
    let lost = 0
    const { impl, paths } = fakeFetch({
      '/api/x': [fail(401, 'UNAUTHENTICATED')],
      '/api/auth/refresh': [fail(401, 'SESSION_REVOKED')],
    })
    const client = createApiClient({ fetchImpl: impl, withRefreshLock: noLock })
    client.setSessionLostHandler(() => { lost += 1 })

    const error = await client.request('/api/x').catch((e) => e)

    expect(error.status).toBe(401)
    expect(lost).toBe(1)
    expect(paths()).toEqual(['/api/x', '/api/auth/refresh'])
  })

  it('jamais de boucle : si le rejeu échoue encore en 401, aucun second renouvellement', async () => {
    const { impl, paths } = fakeFetch({
      '/api/x': [fail(401, 'UNAUTHENTICATED')],
      '/api/auth/refresh': [ok({})],
    })
    const error = await createApiClient({ fetchImpl: impl, withRefreshLock: noLock }).request('/api/x').catch((e) => e)
    expect(error.status).toBe(401)
    expect(paths()).toEqual(['/api/x', '/api/auth/refresh', '/api/x'])
  })

  it('plusieurs requêtes qui échouent ensemble partagent UN SEUL renouvellement', async () => {
    let refreshCalls = 0
    let meCalls = 0
    const impl = async (url) => {
      if (url === '/api/auth/refresh') {
        refreshCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ok({})
      }
      meCalls += 1
      return meCalls <= 3 ? fail(401, 'UNAUTHENTICATED') : ok({ done: true })
    }
    const client = createApiClient({ fetchImpl: impl, withRefreshLock: noLock })

    const results = await Promise.all([client.request('/api/a'), client.request('/api/b'), client.request('/api/c')])

    expect(refreshCalls).toBe(1)
    expect(results).toEqual([{ done: true }, { done: true }, { done: true }])
  })

  it("n'essaie pas de renouveler pour les autres 401 (identifiants invalides, session révoquée) ni avec skipRefresh", async () => {
    for (const code of ['INVALID_CREDENTIALS', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'INVALID_TOKEN']) {
      const { impl, paths } = fakeFetch({ '/api/x': [fail(401, code)] })
      await createApiClient({ fetchImpl: impl, withRefreshLock: noLock }).request('/api/x').catch(() => {})
      expect(paths()).toEqual(['/api/x'])
    }
    const { impl, paths } = fakeFetch({ '/api/auth/login': [fail(401, 'UNAUTHENTICATED')] })
    await createApiClient({ fetchImpl: impl, withRefreshLock: noLock }).request('/api/auth/login', { skipRefresh: true }).catch(() => {})
    expect(paths()).toEqual(['/api/auth/login'])
  })

  it('panne réseau pendant le renouvellement : la session n\'est pas déclarée perdue', async () => {
    let lost = 0
    const { impl } = fakeFetch({
      '/api/x': [fail(401, 'UNAUTHENTICATED')],
      '/api/auth/refresh': [new TypeError('Failed to fetch')],
    })
    const client = createApiClient({ fetchImpl: impl, withRefreshLock: noLock })
    client.setSessionLostHandler(() => { lost += 1 })

    const error = await client.request('/api/x').catch((e) => e)

    expect(error.code).toBe('NETWORK_ERROR')
    expect(lost).toBe(0)
  })

  it('exécute le renouvellement sous le verrou fourni (protection entre onglets)', async () => {
    let locked = 0
    const lock = (task) => { locked += 1; return task() }
    const { impl } = fakeFetch({
      '/api/x': [fail(401, 'UNAUTHENTICATED'), ok(1)],
      '/api/auth/refresh': [ok({})],
    })
    await createApiClient({ fetchImpl: impl, withRefreshLock: lock }).request('/api/x')
    expect(locked).toBe(1)
  })
})
