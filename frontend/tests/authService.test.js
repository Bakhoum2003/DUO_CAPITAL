import { describe, expect, it } from 'vitest'
import { RegistrationDisabledError, createAuthService, registerUser } from '../src/services/authService'

function fakeClient(response) {
  const calls = []
  return { calls, request: async (path, options) => { calls.push({ path, options }); return response } }
}

describe("service d'authentification", () => {
  it('login : POST /api/auth/login avec email et mot de passe, sans renouvellement automatique', async () => {
    const client = fakeClient({ user: {} })
    await createAuthService(client).login({ email: 'a@b.sn', password: 'secret-1' })
    expect(client.calls[0]).toEqual({
      path: '/api/auth/login',
      options: { method: 'POST', body: { email: 'a@b.sn', password: 'secret-1' }, skipRefresh: true },
    })
  })

  it("fetchCurrentUser : GET /api/auth/me, retourne l'utilisateur", async () => {
    const client = fakeClient({ user: { name: 'Cheikh Sow' } })
    const user = await createAuthService(client).fetchCurrentUser()
    expect(client.calls[0].path).toBe('/api/auth/me')
    expect(user.name).toBe('Cheikh Sow')
  })

  it('logout : POST /api/auth/logout', async () => {
    const client = fakeClient({ loggedOut: true })
    await createAuthService(client).logout()
    expect(client.calls[0]).toEqual({ path: '/api/auth/logout', options: { method: 'POST', skipRefresh: true } })
  })

  it("l'inscription publique n'existe pas", async () => {
    const error = await registerUser().catch((e) => e)
    expect(error).toBeInstanceOf(RegistrationDisabledError)
  })
})
