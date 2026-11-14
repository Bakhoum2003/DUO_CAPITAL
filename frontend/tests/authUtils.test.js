import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NETWORK_ERROR_MESSAGE, getErrorMessage } from '../src/utils/apiErrors'
import { validateLoginForm } from '../src/utils/validators'
import { toCurrentUserView } from '../src/utils/userView'

describe('formulaire de connexion : validation', () => {
  it("email et mot de passe obligatoires", () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: "L'adresse email est obligatoire.",
      password: 'Le mot de passe est obligatoire.',
    })
  })

  it("refuse un nom d'utilisateur (le serveur n'accepte que l'email) et un email mal formé", () => {
    expect(validateLoginForm({ email: 'mohamed', password: 'x' }).email).toBeTruthy()
    expect(validateLoginForm({ email: 'a@b', password: 'x' }).email).toBeTruthy()
    expect(validateLoginForm({ email: `${'a'.repeat(250)}@b.sn`, password: 'x' }).email).toBeTruthy()
  })

  it('accepte un email valide avec espaces autour', () => {
    expect(validateLoginForm({ email: '  mohamed@example.com ', password: 'x' })).toEqual({})
  })
})

describe('utilisateur affiché', () => {
  it.each([
    [{ id: '1', name: 'Mohamed Bakhoum', email: 'm@example.com', partnerNumber: 1 }, 'Mohamed Bakhoum', 'MB', 'Associé n°1'],
    [{ id: '2', name: 'Cheikh Sow', email: 'c@example.com', partnerNumber: 2 }, 'Cheikh Sow', 'CS', 'Associé n°2'],
  ])('se construit uniquement depuis la réponse du serveur (%#)', (user, fullName, initials, role) => {
    const view = toCurrentUserView(user)
    expect([view.fullName, view.initials, view.role]).toEqual([fullName, initials, role])
  })
})

describe("messages d'erreur", () => {
  it('réseau, validation, identifiants, limitation, serveur', () => {
    expect(getErrorMessage({ code: 'NETWORK_ERROR', status: 0 })).toBe(NETWORK_ERROR_MESSAGE)
    expect(getErrorMessage({ code: 'VALIDATION_ERROR', status: 400, message: 'x' })).toContain('invalides')
    expect(getErrorMessage({ code: 'INVALID_CREDENTIALS', status: 401, message: 'Email ou mot de passe incorrect.' })).toBe('Email ou mot de passe incorrect.')
    expect(getErrorMessage({ code: 'TOO_MANY_LOGIN_ATTEMPTS', status: 429, message: 'Trop de tentatives.' })).toBe('Trop de tentatives.')
    expect(getErrorMessage({ status: 500, message: 'détail technique' })).not.toContain('détail technique')
    expect(getErrorMessage(null)).toBeTruthy()
  })
})

describe('sécurité du code frontend', () => {
  const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8')

  it("aucun jeton ni identité n'est stocké dans le navigateur ni lu depuis document.cookie", () => {
    for (const file of ['auth/authStore.js', 'auth/defaultAuthStore.js', 'services/apiClient.js', 'services/authService.js', 'context/AuthContext.jsx']) {
      const source = read(file)
      expect(source).not.toContain('localStorage')
      expect(source).not.toContain('sessionStorage')
      expect(source).not.toContain('document.cookie')
    }
  })

  it("aucun nom d'associé codé en dur dans le code d'authentification ni dans le layout", () => {
    for (const file of ['auth/authStore.js', 'context/AuthContext.jsx', 'layouts/DashboardLayout.jsx', 'pages/auth/LoginPage.jsx', 'utils/userView.js']) {
      const source = read(file)
      expect(source).not.toContain('Mohamed')
      expect(source).not.toContain('Cheikh')
    }
  })
})
