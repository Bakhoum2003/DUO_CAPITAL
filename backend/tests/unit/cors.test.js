import { describe, expect, it } from 'vitest'
import { createCorsOptions } from '../../src/config/cors.js'

function decide(options, origin) {
  let result
  options.origin(origin, (err, allowed) => {
    expect(err).toBeNull()
    result = allowed
  })
  return result
}

describe('createCorsOptions', () => {
  const options = createCorsOptions(['http://localhost:5173'])

  it('autorise une origine listée', () => {
    expect(decide(options, 'http://localhost:5173')).toBe(true)
  })

  it('refuse une origine non listée', () => {
    expect(decide(options, 'https://autre.example.com')).toBe(false)
  })

  it('refuse une requête sans origine pour les en-têtes CORS (pas de joker)', () => {
    expect(decide(options, undefined)).toBe(false)
  })

  it('autorise les cookies et limite les méthodes', () => {
    expect(options.credentials).toBe(true)
    expect(options.methods).toContain('PATCH')
    expect(options.methods).toContain('PUT')
    // Liste exacte : aucune autre méthode n'est autorisée (pas de TRACE, CONNECT, HEAD, etc.).
    expect([...options.methods].sort()).toEqual(['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'])
  })

  it("garde une liste blanche d'origines : jamais de joker, en-têtes autorisés inchangés", () => {
    expect(options.origin).toBeTypeOf('function')
    expect(decide(options, '*')).toBe(false)
    expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'])
  })

  it("n'autorise personne si la liste est vide", () => {
    expect(decide(createCorsOptions([]), 'http://localhost:5173')).toBe(false)
  })
})
