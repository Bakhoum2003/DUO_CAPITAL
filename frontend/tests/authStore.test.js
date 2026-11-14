import { describe, expect, it } from 'vitest'
import { AUTH_STATUS, SESSION_EXPIRED_NOTICE, createAuthStore } from '../src/auth/authStore'
import { ApiError } from '../src/services/apiClient'

const USERS = {
  mohamed: { id: '1', name: 'Mohamed Bakhoum', email: 'mohamed@example.com', partnerNumber: 1 },
  cheikh: { id: '2', name: 'Cheikh Sow', email: 'cheikh@example.com', partnerNumber: 2 },
}
const unauthenticated = () => new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Authentification requise.' })
const network = () => new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'réseau' })

/** Faux service d'authentification : le « serveur » répond ce qu'on lui demande. */
function fakeService({ me = [USERS.mohamed], login = [{}], logout = [{}] } = {}) {
  const calls = []
  const answer = (list, name) => async () => {
    calls.push(name)
    const next = list.length > 1 ? list.shift() : list[0]
    if (next instanceof Error) throw next
    return next
  }
  return { calls, service: { fetchCurrentUser: answer(me, 'me'), login: answer(login, 'login'), logout: answer(logout, 'logout') } }
}

describe("état d'authentification : initialisation", () => {
  it.each([
    ['Mohamed Bakhoum', USERS.mohamed],
    ['Cheikh Sow', USERS.cheikh],
  ])("l'identité vient du serveur (%s)", async (name, user) => {
    const { service } = fakeService({ me: [user] })
    const store = createAuthStore({ authService: service })
    expect(store.getState().status).toBe(AUTH_STATUS.INITIALIZING)

    await store.init()

    expect(store.getState().status).toBe(AUTH_STATUS.AUTHENTICATED)
    expect(store.getState().user.name).toBe(name)
  })

  it('sans session (401) : non authentifié, sans message', async () => {
    const { service } = fakeService({ me: [unauthenticated()] })
    const store = createAuthStore({ authService: service })
    await store.init()
    expect(store.getState().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(store.getState().user).toBeNull()
    expect(store.getState().notice).toBe('')
  })

  it('serveur injoignable : état erreur (pas « déconnecté »), puis nouvel essai réussi', async () => {
    const { service } = fakeService({ me: [network(), USERS.cheikh] })
    const store = createAuthStore({ authService: service })

    await store.init()
    expect(store.getState().status).toBe(AUTH_STATUS.ERROR)
    expect(store.getState().errorMessage).toContain('serveur')

    await store.retry()
    expect(store.getState().status).toBe(AUTH_STATUS.AUTHENTICATED)
    expect(store.getState().user.name).toBe('Cheikh Sow')
  })

  it("n'interroge le serveur qu'une fois, même si init est appelée plusieurs fois (React StrictMode)", async () => {
    const { service, calls } = fakeService()
    const store = createAuthStore({ authService: service })
    await Promise.all([store.init(), store.init(), store.init()])
    expect(calls).toEqual(['me'])
  })

  it('prévient les abonnés à chaque changement', async () => {
    const { service } = fakeService()
    const store = createAuthStore({ authService: service })
    let notified = 0
    const unsubscribe = store.subscribe(() => { notified += 1 })
    await store.init()
    expect(notified).toBe(1)
    unsubscribe()
    store.handleSessionLost()
    expect(notified).toBe(1)
  })
})

describe("état d'authentification : connexion", () => {
  it('connexion réussie : login puis lecture de /me, utilisateur du serveur', async () => {
    const { service, calls } = fakeService({ me: [unauthenticated(), USERS.cheikh] })
    const store = createAuthStore({ authService: service })
    await store.init()

    await store.login({ email: 'cheikh@example.com', password: 'x' })

    expect(calls).toEqual(['me', 'login', 'me'])
    expect(store.getState().status).toBe(AUTH_STATUS.AUTHENTICATED)
    expect(store.getState().user.name).toBe('Cheikh Sow')
  })

  it("mauvais mot de passe : l'erreur est propagée, l'état reste non authentifié", async () => {
    const wrong = new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect.' })
    const { service } = fakeService({ me: [unauthenticated()], login: [wrong] })
    const store = createAuthStore({ authService: service })
    await store.init()

    const error = await store.login({ email: 'a@b.sn', password: 'x' }).catch((e) => e)

    expect(error.code).toBe('INVALID_CREDENTIALS')
    expect(store.getState().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
  })

  it('panne réseau à la connexion : erreur réseau propagée', async () => {
    const { service } = fakeService({ me: [unauthenticated()], login: [network()] })
    const store = createAuthStore({ authService: service })
    await store.init()
    const error = await store.login({ email: 'a@b.sn', password: 'x' }).catch((e) => e)
    expect(error.code).toBe('NETWORK_ERROR')
    expect(store.getState().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
  })

  it("cookies refusés par le navigateur (login OK mais /me en 401) : erreur explicite, pas connecté", async () => {
    const { service } = fakeService({ me: [unauthenticated()], login: [{}] })
    const store = createAuthStore({ authService: service })
    await store.init()
    const error = await store.login({ email: 'a@b.sn', password: 'x' }).catch((e) => e)
    expect(error.code).toBe('SESSION_NOT_STORED')
    expect(store.getState().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
  })

  it('deux soumissions simultanées : une seule connexion envoyée', async () => {
    const { service, calls } = fakeService({ me: [unauthenticated(), USERS.mohamed] })
    const store = createAuthStore({ authService: service })
    await store.init()
    await Promise.all([store.login({ email: 'a', password: 'b' }), store.login({ email: 'a', password: 'b' })])
    expect(calls.filter((c) => c === 'login')).toHaveLength(1)
  })
})

describe("état d'authentification : déconnexion et session perdue", () => {
  it('déconnexion confirmée : utilisateur effacé, non authentifié', async () => {
    const { service, calls } = fakeService()
    const store = createAuthStore({ authService: service })
    await store.init()

    const result = await store.logout()

    expect(result).toEqual({ ok: true })
    expect(calls).toContain('logout')
    expect(store.getState().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(store.getState().user).toBeNull()
  })

  it("serveur injoignable à la déconnexion : l'utilisateur reste connecté et le message le dit", async () => {
    const { service } = fakeService({ logout: [network()] })
    const store = createAuthStore({ authService: service })
    await store.init()

    const result = await store.logout()

    expect(result.ok).toBe(false)
    expect(result.message).toContain('session reste active')
    expect(store.getState().status).toBe(AUTH_STATUS.AUTHENTICATED)
  })

  it('session définitivement perdue pendant l\'usage : retour à la connexion avec un message', async () => {
    const { service } = fakeService()
    const store = createAuthStore({ authService: service })
    await store.init()

    store.handleSessionLost()

    expect(store.getState().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(store.getState().notice).toBe(SESSION_EXPIRED_NOTICE)
  })

  it("un visiteur sans session n'a pas de message d'expiration", async () => {
    const { service } = fakeService({ me: [unauthenticated()] })
    const store = createAuthStore({ authService: service })
    store.handleSessionLost() // pendant l'initialisation
    await store.init()
    expect(store.getState().notice).toBe('')
  })
})
