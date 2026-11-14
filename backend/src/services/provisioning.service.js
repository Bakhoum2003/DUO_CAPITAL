// Création INITIALE et contrôlée des deux comptes (jamais exposée par l'API : lancée uniquement par scripts/provision-partners.js).
//
// Garanties :
// - tout ou rien : les deux comptes sont créés dans UNE transaction ;
// - refus propre (sans aucune modification) si un compte existe déjà : pas de seconde initialisation, pas de troisième compte ;
// - filet de sécurité en base : index uniques sur partnerNumber (1 ou 2) et sur l'email ;
// - aucun mot de passe par défaut ni codé en dur : les mots de passe sont fournis par l'appelant et hachés en Argon2id.

import { PARTNER_COUNT, PARTNER_IDENTITIES } from '../config/partners.js'
import { User } from '../models/User.js'
import { isEmail } from '../models/shared/validators.js'
import { AppError } from '../utils/AppError.js'
import { runInTransaction } from '../utils/transaction.js'
import { getPasswordIssues } from '../validation/passwordPolicy.js'
import { recordAudit } from './audit.service.js'
import { normalizeEmail } from './auth.service.js'
import { hashPassword } from './password.service.js'
import { toPartnerView } from './userView.js'

const validationError = (fields) =>
  new AppError({ status: 400, code: 'PROVISIONING_INVALID', message: 'Les informations des associés sont invalides.', fields })

/** État actuel : nombre de comptes et numéros d'associé présents. */
export async function getProvisioningState() {
  const users = await User.find({}, { partnerNumber: 1 }).lean()
  return { count: users.length, partnerNumbers: users.map((user) => user.partnerNumber).sort() }
}

/** Valide les identifiants fournis ; retourne la liste des erreurs par champ (sans jamais citer un mot de passe). */
export function validateCredentials(credentials) {
  const fields = []
  if (!Array.isArray(credentials) || credentials.length !== PARTNER_COUNT) {
    return [{ field: 'credentials', message: `Exactement ${PARTNER_COUNT} associés sont attendus.` }]
  }

  const seenNumbers = new Set()
  const seenEmails = new Set()
  for (const entry of credentials) {
    const identity = PARTNER_IDENTITIES.find((candidate) => candidate.partnerNumber === entry?.partnerNumber)
    if (!identity) {
      fields.push({ field: 'partnerNumber', message: "Le numéro d'associé doit valoir 1 ou 2." })
      continue
    }
    const prefix = `partner${identity.partnerNumber}`
    if (seenNumbers.has(identity.partnerNumber)) fields.push({ field: `${prefix}.partnerNumber`, message: "Numéro d'associé en double." })
    seenNumbers.add(identity.partnerNumber)

    const email = normalizeEmail(entry.email)
    if (!isEmail(email)) fields.push({ field: `${prefix}.email`, message: "L'email est invalide." })
    else if (seenEmails.has(email)) fields.push({ field: `${prefix}.email`, message: 'Les deux associés ne peuvent pas partager le même email.' })
    seenEmails.add(email)

    for (const message of getPasswordIssues(entry.password, { email, name: identity.name })) {
      fields.push({ field: `${prefix}.password`, message })
    }
  }
  return fields
}

/**
 * Crée les deux comptes en une seule transaction.
 * @param {object} options
 * @param {Array<{ partnerNumber: 1 | 2, email: string, password: string }>} options.credentials
 * @param {{ requestId?: string }} [options.meta]
 * @returns {Promise<Array>} les deux associés (vue publique)
 * @throws {AppError} 400 PROVISIONING_INVALID | 409 PROVISIONING_ALREADY_DONE | PROVISIONING_PARTIAL_STATE | PROVISIONING_CONFLICT
 */
export async function provisionPartners({ credentials, meta = {} }) {
  const fields = validateCredentials(credentials)
  if (fields.length > 0) throw validationError(fields)

  await User.init() // les index uniques doivent exister avant d'écrire (filet de sécurité contre une double exécution)

  const accounts = []
  for (const identity of PARTNER_IDENTITIES) {
    const entry = credentials.find((candidate) => candidate.partnerNumber === identity.partnerNumber)
    accounts.push({
      partnerNumber: identity.partnerNumber,
      name: identity.name,
      email: normalizeEmail(entry.email),
      passwordHash: await hashPassword(entry.password), // Argon2id (service B2)
      status: 'ACTIVE',
    })
  }

  try {
    const created = await runInTransaction(async (dbSession) => {
      const existing = await User.find({}, { partnerNumber: 1 }, { session: dbSession }).lean()
      if (existing.length === PARTNER_COUNT) {
        throw new AppError({ status: 409, code: 'PROVISIONING_ALREADY_DONE', message: 'Les comptes sont déjà initialisés. Aucune modification effectuée.' })
      }
      if (existing.length > 0) {
        throw new AppError({
          status: 409,
          code: 'PROVISIONING_PARTIAL_STATE',
          message: 'Un seul compte existe déjà : état inattendu, aucune modification effectuée. Une vérification manuelle est nécessaire.',
        })
      }

      const users = await User.create(accounts, { session: dbSession, ordered: true })
      for (const user of users) {
        await recordAudit(
          {
            actorType: 'SYSTEM',
            action: 'USER_PROVISIONED',
            resourceType: 'USER',
            resourceId: user._id,
            after: { partnerNumber: user.partnerNumber, name: user.name, email: user.email },
            meta,
          },
          { dbSession },
        )
      }
      return users
    })
    return created.map(toPartnerView)
  } catch (err) {
    // Deux exécutions simultanées : l'index unique laisse passer une seule transaction.
    if (err?.code === 11000) {
      throw new AppError({ status: 409, code: 'PROVISIONING_CONFLICT', message: "Un compte avec ce numéro d'associé ou cet email existe déjà. Aucune modification effectuée." })
    }
    throw err
  }
}
