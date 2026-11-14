import { MAX_PASSWORD_LENGTH } from '../config/constants.js'

export const MIN_PASSWORD_LENGTH = 12
const MIN_DISTINCT_CHARACTERS = 6
const COMMON_FRAGMENTS = ['motdepasse', 'password', 'azerty', 'qwerty', '123456', 'abcdef', 'duocapital']

const normalize = (value) => String(value ?? '').toLowerCase()

/**
 * Règles d'un mot de passe (création des comptes, changement de mot de passe).
 * Retourne la liste des règles non respectées, en français et SANS jamais citer le mot de passe.
 *
 * @param {unknown} password
 * @param {{ email?: string, name?: string }} [identity] le mot de passe ne doit pas contenir l'identifiant ni le nom
 * @returns {string[]} vide si le mot de passe est acceptable
 */
export function getPasswordIssues(password, { email, name } = {}) {
  if (typeof password !== 'string' || password.trim() === '') return ['Le mot de passe est obligatoire.']

  const issues = []
  if (password.length < MIN_PASSWORD_LENGTH) issues.push(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`)
  if (password.length > MAX_PASSWORD_LENGTH) issues.push(`Le mot de passe est limité à ${MAX_PASSWORD_LENGTH} caractères.`)
  if (new Set(password).size < MIN_DISTINCT_CHARACTERS) issues.push('Le mot de passe est trop répétitif.')

  const lowered = normalize(password)
  const localPart = normalize(email).split('@')[0]
  if (localPart.length >= 4 && lowered.includes(localPart)) issues.push("Le mot de passe ne doit pas contenir votre adresse email.")
  const nameParts = normalize(name).split(/\s+/).filter((part) => part.length >= 4)
  if (nameParts.some((part) => lowered.includes(part))) issues.push('Le mot de passe ne doit pas contenir votre nom.')
  if (COMMON_FRAGMENTS.some((fragment) => lowered.replace(/[\s_-]/g, '').includes(fragment))) issues.push('Le mot de passe est trop courant.')

  return issues
}
