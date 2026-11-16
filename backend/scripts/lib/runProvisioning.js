// Ne contient AUCUN mot de passe par défaut : tout est saisi par l'opérateur, masqué, et jamais affiché ni journalisé.

import { PARTNER_IDENTITIES } from '../../src/config/partners.js'
import { getProvisioningState, provisionPartners, validateCredentials } from '../../src/services/provisioning.service.js'
import { normalizeEmail } from '../../src/services/auth.service.js'
import { getPasswordIssues } from '../../src/validation/passwordPolicy.js'
import { isEmail } from '../../src/models/shared/validators.js'

const MAX_ATTEMPTS = 3

export class ProvisioningAborted extends Error {
  constructor(message) {
    super(message)
    this.name = 'ProvisioningAborted'
  }
}

async function askEmail(io, identity) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const email = normalizeEmail(await io.ask(`Email de ${identity.name} : `))
    if (isEmail(email)) return email
    io.print("Email invalide.")
  }
  throw new ProvisioningAborted(`Email de ${identity.name} invalide : abandon.`)
}

async function askPassword(io, identity, email) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const password = await io.askSecret(`Mot de passe de ${identity.name} (saisie masquée) : `)
    const issues = getPasswordIssues(password, { email, name: identity.name })
    if (issues.length > 0) {
      issues.forEach((issue) => io.print(issue))
      continue
    }
    if ((await io.askSecret('Confirmez le mot de passe : ')) !== password) {
      io.print('Les deux saisies ne correspondent pas.')
      continue
    }
    return password
  }
  throw new ProvisioningAborted(`Mot de passe de ${identity.name} refusé : abandon.`)
}

/**
 * @param {object} options
 * @param {object} options.config configuration validée (jamais en environnement de test)
 * @param {{ isInteractive: boolean, print: Function, ask: Function, askSecret: Function }} options.io
 * @param {boolean} [options.dryRun] aucune écriture, aucune saisie de mot de passe
 * @returns {Promise<{ status: 'created' | 'already-initialized' | 'dry-run', users?: object[] }>}
 */
export async function runProvisioning({ config, io, dryRun = false }) {
  if (config.env === 'test') throw new ProvisioningAborted('Refusé : ce script ne s’exécute jamais en environnement de test.')
  if (!io.isInteractive) throw new ProvisioningAborted('Refusé : terminal interactif obligatoire (aucun mot de passe ne se passe en argument ni en variable).')

  const databaseName = config.database.name
  io.print(`Base cible : ${databaseName} (hôte : ${config.database.host ?? 'inconnu'})`)

  const state = await getProvisioningState()
  if (state.count > 0) {
    io.print(
      state.count === PARTNER_IDENTITIES.length
        ? 'Les deux comptes existent déjà : aucune modification effectuée.'
        : `État inattendu : ${state.count} compte(s) présent(s). Aucune modification effectuée, vérification manuelle nécessaire.`,
    )
    return { status: 'already-initialized' }
  }

  if (dryRun) {
    io.print(`Simulation : les comptes de ${PARTNER_IDENTITIES.map((p) => p.name).join(' et ')} seraient créés. Rien n'a été écrit.`)
    return { status: 'dry-run' }
  }

  const answer = await io.ask(`Pour confirmer la création des deux comptes, tapez exactement le nom de la base (${databaseName}) : `)
  if (answer.trim() !== databaseName) throw new ProvisioningAborted('Confirmation incorrecte : abandon, rien n’a été écrit.')

  const credentials = []
  for (const identity of PARTNER_IDENTITIES) {
    const email = await askEmail(io, identity)
    const password = await askPassword(io, identity, email)
    credentials.push({ partnerNumber: identity.partnerNumber, email, password })
  }

  const fields = validateCredentials(credentials)
  if (fields.length > 0) throw new ProvisioningAborted(`Informations invalides : ${fields.map((f) => f.message).join(' ')}`)

  const users = await provisionPartners({ credentials, meta: { requestId: 'cli-provisioning' } })
  io.print('Comptes créés :')
  users.forEach((user) => io.print(`  - associé ${user.partnerNumber} : ${user.name} <${user.email}>`))
  return { status: 'created', users }
}
