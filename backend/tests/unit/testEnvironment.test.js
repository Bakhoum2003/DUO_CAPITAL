import { describe, expect, it } from 'vitest'

describe('environnement de test verrouillé (tests/setup/testEnv.js)', () => {
  it('NODE_ENV vaut « test »', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it("DATABASE_URL (base de développement/production) n'est jamais disponible dans les tests", () => {
    expect(process.env.DATABASE_URL).toBeUndefined()
  })
})
