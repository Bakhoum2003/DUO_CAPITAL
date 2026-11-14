import { describe, expect, it } from 'vitest'
import { PARTNER_IDENTITIES } from '../../../src/config/partners.js'
import { getPasswordIssues } from '../../../src/validation/passwordPolicy.js'
import { accountStatusSchema, changeEmailSchema, changePasswordSchema, updateProfileSchema } from '../../../src/validation/user.schemas.js'
import { toPartnerView } from '../../../src/services/userView.js'

const STRONG = 'Zèbre-bleu-Orage-4821'
const identity = { email: 'mohamed.bakhoum@example.com', name: 'Mohamed Bakhoum' }

describe('identités des associés', () => {
  it('définit exactement Mohamed Bakhoum (1) et Cheikh Sow (2), figées', () => {
    expect(PARTNER_IDENTITIES.map((p) => [p.partnerNumber, p.name])).toEqual([[1, 'Mohamed Bakhoum'], [2, 'Cheikh Sow']])
    expect(Object.isFrozen(PARTNER_IDENTITIES)).toBe(true)
  })
})

describe('politique de mot de passe', () => {
  it('accepte un mot de passe solide', () => {
    expect(getPasswordIssues(STRONG, identity)).toEqual([])
  })

  it.each([
    ['vide', ''],
    ['espaces', '            '],
    ['trop court', 'Ab1!xyz'],
    ['répétitif', 'aaaaaaaaaaaaaaaa'],
    ['courant', 'MonPassword-2024-xyz'],
    ['contient le nom', 'Super-bakhoum-9182'],
    ['contient l’email', 'xx-mohamed.bakhoum-77'],
    ['non textuel', 12345678901234],
  ])('refuse un mot de passe %s', (_label, value) => {
    expect(getPasswordIssues(value, identity).length).toBeGreaterThan(0)
  })

  it('refuse un mot de passe trop long', () => {
    expect(getPasswordIssues(`${STRONG}${'x'.repeat(1100)}`, identity).length).toBeGreaterThan(0)
  })

  it('ne cite jamais le mot de passe dans ses messages', () => {
    expect(getPasswordIssues('Super-bakhoum-9182', identity).join(' ')).not.toContain('Super-bakhoum-9182')
  })
})

describe('schémas des routes utilisateurs', () => {
  it('refuse tout champ non prévu (rôle, numéro d’associé, statut, empreinte)', () => {
    for (const extra of [{ role: 'admin' }, { partnerNumber: 2 }, { status: 'DISABLED' }, { passwordHash: 'x' }]) {
      expect(updateProfileSchema.safeParse({ name: 'Nouveau Nom', ...extra }).success).toBe(false)
    }
  })

  it('valide un nom et le nettoie', () => {
    const parsed = updateProfileSchema.safeParse({ name: '  Nouveau Nom  ' })
    expect(parsed.success).toBe(true)
    expect(parsed.data.name).toBe('Nouveau Nom')
    expect(updateProfileSchema.safeParse({ name: 'A' }).success).toBe(false)
  })

  it('exige le mot de passe actuel pour changer d’email, de mot de passe ou de statut', () => {
    expect(changeEmailSchema.safeParse({ email: 'a@example.com' }).success).toBe(false)
    expect(changeEmailSchema.safeParse({ email: 'pas-un-email', currentPassword: 'x' }).success).toBe(false)
    expect(changeEmailSchema.safeParse({ email: 'a@example.com', currentPassword: 'x' }).success).toBe(true)
    expect(changePasswordSchema.safeParse({ newPassword: STRONG }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: STRONG }).success).toBe(true)
    expect(accountStatusSchema.safeParse({}).success).toBe(false)
    expect(accountStatusSchema.safeParse({ currentPassword: 'x', status: 'ACTIVE' }).success).toBe(false)
  })
})

describe('vue d’un associé', () => {
  it('n’expose que les champs publics', () => {
    const view = toPartnerView({
      _id: '507f1f77bcf86cd799439011', name: 'A', email: 'a@example.com', partnerNumber: 1, status: 'ACTIVE',
      passwordHash: '$argon2id$secret', failedLoginAttempts: 3, lockedUntil: new Date(),
    })
    expect(Object.keys(view).sort()).toEqual(['email', 'id', 'lastLoginAt', 'name', 'partnerNumber', 'status'])
    expect(JSON.stringify(view)).not.toContain('argon2')
  })
})
