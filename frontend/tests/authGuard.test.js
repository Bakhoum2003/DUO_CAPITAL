import { describe, expect, it } from 'vitest'
import { AUTH_STATUS } from '../src/auth/authStore'
import { decideProtectedRoute, decidePublicOnlyRoute, getPostLoginPath } from '../src/routes/authGuard'

describe('protection des routes', () => {
  it('page privée : attend la vérification (pas de flash), redirige les visiteurs, laisse entrer les connectés', () => {
    expect(decideProtectedRoute(AUTH_STATUS.INITIALIZING)).toBe('loading')
    expect(decideProtectedRoute(AUTH_STATUS.UNAUTHENTICATED)).toBe('redirect-login')
    expect(decideProtectedRoute(AUTH_STATUS.AUTHENTICATED)).toBe('allow')
    expect(decideProtectedRoute(AUTH_STATUS.ERROR)).toBe('error')
  })

  it('page de connexion : un utilisateur connecté est redirigé, les autres la voient', () => {
    expect(decidePublicOnlyRoute(AUTH_STATUS.INITIALIZING)).toBe('loading')
    expect(decidePublicOnlyRoute(AUTH_STATUS.AUTHENTICATED)).toBe('redirect-app')
    expect(decidePublicOnlyRoute(AUTH_STATUS.UNAUTHENTICATED)).toBe('allow')
    expect(decidePublicOnlyRoute(AUTH_STATUS.ERROR)).toBe('allow')
  })

  it('destination après connexion : la page visée si elle est interne, sinon le dashboard', () => {
    expect(getPostLoginPath({ from: '/cotisations' }, '/dashboard', '/connexion')).toBe('/cotisations')
    expect(getPostLoginPath(undefined, '/dashboard', '/connexion')).toBe('/dashboard')
    expect(getPostLoginPath({ from: '//evil.example' }, '/dashboard', '/connexion')).toBe('/dashboard')
    expect(getPostLoginPath({ from: 'https://evil.example' }, '/dashboard', '/connexion')).toBe('/dashboard')
    expect(getPostLoginPath({ from: '/connexion' }, '/dashboard', '/connexion')).toBe('/dashboard')
    expect(getPostLoginPath({ from: 42 }, '/dashboard', '/connexion')).toBe('/dashboard')
  })
})
