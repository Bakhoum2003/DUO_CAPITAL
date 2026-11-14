import { afterEach, describe, expect, it } from 'vitest'
import { activitiesApi } from '../src/services/activitiesApi'
import { dashboardReducer, initialDashboardState } from '../src/hooks/dashboardState'
import { IDLE_MUTATION, runMutation } from '../src/hooks/activityMutation'

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
const noTokenInRequest = (call) => /authorization|bearer/i.test(JSON.stringify(call.init.headers)) === false

describe('service des activités (API réelle, cookies HttpOnly)', () => {
  it('liste : paramètres exacts du backend, cookies envoyés, meta conservée, aucun jeton manuel', async () => {
    const meta = { page: 2, pageSize: 12, total: 30, totalPages: 3, counts: { total: 30 }, categories: ['Textile'] }
    const calls = stubFetch(() => respond(200, { data: { activities: [] }, meta }))
    const result = await activitiesApi.list({ search: 'café', status: 'SUSPENDED', category: 'Textile', sort: 'name_asc', page: 2 })
    expect(result).toEqual({ data: { activities: [] }, meta })
    const url = new URL(calls[0].url, 'http://x')
    expect(url.pathname).toBe('/api/v1/activities')
    expect(Object.fromEntries(url.searchParams)).toEqual({ search: 'café', status: 'SUSPENDED', category: 'Textile', sort: 'name_asc', page: '2', pageSize: '12' })
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.credentials).toBe('include')
    expect(noTokenInRequest(calls[0])).toBe(true)
  })

  it('liste sans filtre : seuls tri, page et taille sont envoyés', async () => {
    const calls = stubFetch(() => respond(200, { data: { activities: [] }, meta: {} }))
    await activitiesApi.list({ search: '', status: '', category: '', sort: 'start_desc', page: 1 })
    expect(calls[0].url).toContain('/api/v1/activities?sort=start_desc&page=1&pageSize=12')
  })

  it('détail : GET /:id avec identifiant encodé', async () => {
    const calls = stubFetch(() => respond(200, { data: { activity: { id: 'a1' } } }))
    expect(await activitiesApi.get('a1')).toEqual({ activity: { id: 'a1' } })
    expect(calls[0].url).toContain('/api/v1/activities/a1')
    await activitiesApi.get('../x?y')
    expect(calls[1].url).not.toContain('../')
  })

  it('création : POST JSON sans statut ni auteur', async () => {
    const calls = stubFetch(() => respond(201, { data: { activity: { id: 'a1' } } }))
    await activitiesApi.create({ name: 'Pagnes', description: '', category: null, startDate: '2026-12-10' })
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].url).toContain('/api/v1/activities')
    const body = JSON.parse(calls[0].init.body)
    expect(body).toEqual({ name: 'Pagnes', description: '', category: null, startDate: '2026-12-10' })
    expect(['status', 'createdBy', 'amount'].some((key) => key in body)).toBe(false)
  })

  it('modification : PATCH avec les seuls champs fournis', async () => {
    const calls = stubFetch(() => respond(200, { data: { activity: { id: 'a1' } } }))
    await activitiesApi.update('a1', { name: 'Nouveau nom' })
    expect(calls[0].init.method).toBe('PATCH')
    expect(calls[0].url).toContain('/api/v1/activities/a1')
    expect(JSON.parse(calls[0].init.body)).toEqual({ name: 'Nouveau nom' })
  })

  it.each([
    ['suspend', undefined, {}],
    ['reactivate', undefined, {}],
    ['archive', undefined, {}],
    ['complete', { endDate: '2026-12-18' }, { endDate: '2026-12-18' }],
    ['complete', { endDate: '' }, {}],
    ['reopen', { reason: '  Nouveau lot  ' }, { reason: 'Nouveau lot' }],
  ])('statut %s : POST /:id/%s avec le corps exact attendu', async (action, input, expectedBody) => {
    const calls = stubFetch(() => respond(200, { data: { activity: { id: 'a1' } } }))
    await activitiesApi.transition('a1', action, input)
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].url).toContain(`/api/v1/activities/a1/${action}`)
    expect(JSON.parse(calls[0].init.body)).toEqual(expectedBody)
  })

  it("aucune méthode DELETE n'existe dans le service ni n'est envoyée", async () => {
    expect(Object.keys(activitiesApi).sort()).toEqual(['create', 'get', 'list', 'transition', 'update'])
  })

  it('erreurs : code métier, champs et statut conservés ; erreur réseau distincte', async () => {
    stubFetch(() => respond(409, { error: { code: 'INVALID_STATUS_TRANSITION', message: 'Transition interdite.' } }))
    await expect(activitiesApi.transition('a1', 'suspend')).rejects.toMatchObject({ status: 409, code: 'INVALID_STATUS_TRANSITION' })

    stubFetch(() => respond(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalide.', fields: [{ field: 'name', message: 'Trop court.' }] } }))
    await expect(activitiesApi.create({})).rejects.toMatchObject({ status: 400, fields: [{ field: 'name', message: 'Trop court.' }] })

    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(activitiesApi.list({})).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('session expirée : un seul renouvellement puis un seul rejeu ; refresh refusé = erreur 401 propagée', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('/api/auth/refresh')) return respond(200, { data: {} })
      return calls.filter((call) => call.url.includes('/api/v1/activities')).length === 1 ? respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Expirée.' } }) : respond(200, { data: { activities: [] }, meta: {} })
    })
    await activitiesApi.list({})
    expect(calls.map((call) => new URL(call.url, 'http://x').pathname)).toEqual(['/api/v1/activities', '/api/auth/refresh', '/api/v1/activities'])

    stubFetch((url) => respond(401, { error: { code: url.includes('refresh') ? 'REFRESH_TOKEN_INVALID' : 'UNAUTHENTICATED', message: 'Non.' } }))
    await expect(activitiesApi.list({})).rejects.toMatchObject({ status: 401 })
  })
})

describe('état de chargement des activités (réducteur partagé)', () => {
  it('chargement, succès, échec sans effacer les dernières données, réponse périmée ignorée', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    expect(state.status).toBe('loading')
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { data: { activities: [] }, meta: {} } })
    expect(state.status).toBe('ready')
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    expect(state.status).toBe('refreshing')
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: 'périmée' })
    expect(state.data).toEqual({ data: { activities: [] }, meta: {} })
    state = dashboardReducer(state, { type: 'failure', requestId: 2, message: 'Erreur' })
    expect(state).toMatchObject({ status: 'error', errorMessage: 'Erreur' })
    expect(state.data).not.toBeNull()
  })
})

describe('écritures : aucune double soumission', () => {
  it('une seconde écriture pendant la première est ignorée ; succès et échec rendent la main', async () => {
    const states = []
    const guard = { current: false }
    const setMutation = (value) => states.push(value.status)
    let release
    const slow = () => new Promise((resolve) => (release = () => resolve({ activity: { id: 'a1' } })))
    const first = runMutation(slow, { guard, setMutation })
    const second = await runMutation(() => Promise.resolve('x'), { guard, setMutation })
    expect(second).toEqual({ ok: false })
    release()
    expect(await first).toEqual({ ok: true, data: { activity: { id: 'a1' } } })
    expect(guard.current).toBe(false)

    const failure = await runMutation(() => Promise.reject({ code: 'ACTIVITY_NAME_ALREADY_USED', fields: [{ field: 'name', message: 'Déjà pris.' }] }), { guard, setMutation })
    expect(failure).toEqual({ ok: false })
    expect(guard.current).toBe(false)
    expect(states).toEqual(['submitting', 'idle', 'submitting', 'error'])
    expect(IDLE_MUTATION.status).toBe('idle')
  })

  it("l'erreur du serveur est exposée au formulaire avec ses champs", async () => {
    let last
    await runMutation(() => Promise.reject({ code: 'ACTIVITY_NAME_ALREADY_USED', message: 'x', fields: [{ field: 'name', message: 'Déjà pris.' }] }), { guard: { current: false }, setMutation: (value) => (last = value) })
    expect(last).toMatchObject({ status: 'error', message: 'Une activité non archivée porte déjà ce nom.', fieldErrors: { name: 'Déjà pris.' } })
  })
})
