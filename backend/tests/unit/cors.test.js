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
    expect(options.methods).not.toContain('PUT')
  })

  it("n'autorise personne si la liste est vide", () => {
    expect(decide(createCorsOptions([]), 'http://localhost:5173')).toBe(false)
  })
})
