import { afterEach, describe, expect, it } from 'vitest'
import { settingsApi } from '../src/services/settingsApi'

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

describe('service des Paramètres (API réelle, cookies HttpOnly)', () => {
  it('GET /api/v1/settings : cookies envoyés, aucun jeton manuel', async () => {
    const calls = stubFetch(() => respond(200, { data: { fund: { version: 3 } } }))
    expect(await settingsApi.getSettings()).toEqual({ fund: { version: 3 } })
    expect(pathOf(calls[0])).toBe('/api/v1/settings')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.credentials).toBe('include')
    expect(/authorization|bearer/i.test(JSON.stringify(calls[0].init.headers))).toBe(false)
  })

  it('PUT /api/v1/settings : envoie expectedVersion et les champs modifiés', async () => {
    const calls = stubFetch(() => respond(200, { data: { fund: { version: 4 }, changed: true } }))
    await settingsApi.updateSettings({ expectedVersion: 3, description: 'Nouvelle description du fonds.' })
    expect(pathOf(calls[0])).toBe('/api/v1/settings')
    expect(calls[0].init.method).toBe('PUT')
    expect(JSON.parse(calls[0].init.body)).toEqual({ expectedVersion: 3, description: 'Nouvelle description du fonds.' })
  })

  it('conflit de version : ApiError 409 SETTINGS_VERSION_CONFLICT', async () => {
    stubFetch(() => respond(409, { error: { code: 'SETTINGS_VERSION_CONFLICT', message: 'Conflit' } }))
    await expect(settingsApi.updateSettings({ expectedVersion: 1, description: 'x'.repeat(12) })).rejects.toMatchObject({
      status: 409,
      code: 'SETTINGS_VERSION_CONFLICT',
    })
  })

  it('préférences : GET, PUT partiel et réinitialisation personnelle (POST)', async () => {
    const calls = stubFetch(() => respond(200, { data: { preferences: {} } }))
    await settingsApi.getPreferences()
    await settingsApi.updatePreferences({ theme: 'dark' })
    await settingsApi.resetPreferences()
    expect(calls.map((call) => [call.init.method, pathOf(call)])).toEqual([
      ['GET', '/api/v1/settings/preferences'],
      ['PUT', '/api/v1/settings/preferences'],
      ['POST', '/api/v1/settings/preferences/reset'],
    ])
    expect(JSON.parse(calls[1].init.body)).toEqual({ theme: 'dark' })
  })

  it("l'identité de l'associé n'est jamais envoyée (ni userId, ni email)", async () => {
    const calls = stubFetch(() => respond(200, { data: {} }))
    await settingsApi.updatePreferences({ amountSeparator: 'dot' })
    await settingsApi.resetPreferences()
    for (const call of calls) expect(/userId|user|email|partner/i.test(call.init.body ?? '')).toBe(false)
  })

  it('rappels et sécurité : lecture seule (GET)', async () => {
    const calls = stubFetch(() => respond(200, { data: {} }))
    await settingsApi.getContributionReminders()
    await settingsApi.getSecurity()
    expect(calls.map((call) => [call.init.method, pathOf(call)])).toEqual([
      ['GET', '/api/v1/settings/contribution-reminders'],
      ['GET', '/api/v1/settings/security'],
    ])
  })

  it('erreur réseau : ApiError NETWORK_ERROR', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed')
    }
    await expect(settingsApi.getPreferences()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
