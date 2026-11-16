// Principes de sécurité :
// - aucune valeur sensible dans le code : tout vient de l'environnement (fichier .env, jamais versionné) ;
// - en environnement « test », la base utilisée est TOUJOURS TEST_DATABASE_URL, et son nom doit contenir « test » ;
// - une base dont le nom contient « test » est refusée en développement et en production (et inversement),

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'
import { isValidPeriod } from '../utils/businessDates.js'
import {
  ACCOUNT_LOCK_DURATION_MS,
  DEFAULT_ACCESS_TOKEN_TTL_MINUTES,
  DEFAULT_REFRESH_TOKEN_TTL_DAYS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  LOGIN_RATE_LIMIT_MAX_FAILURES,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  MAX_FAILED_LOGINS,
  MIN_JWT_SECRET_LENGTH,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  SENSITIVE_RATE_LIMIT_MAX_FAILURES,
  SENSITIVE_RATE_LIMIT_WINDOW_MS,
} from './constants.js'

export const ENVIRONMENTS = ['development', 'test', 'production']
export const COOKIE_SAME_SITE_VALUES = ['lax', 'strict', 'none']
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']

const DEFAULT_FRONTEND_URL = 'http://localhost:5173'
const DEFAULT_PORT = 4000
const DEFAULT_MONGO_MAX_POOL_SIZE = 10
const MAX_MONGO_POOL_SIZE = 100
const MAX_TRUSTED_PROXIES = 5

export class ConfigError extends Error {
  /** @param {Array<{variable: string, message: string}>} issues */
  constructor(issues) {
    super(`Configuration invalide :\n${issues.map((issue) => `- ${issue.variable} : ${issue.message}`).join('\n')}`)
    this.name = 'ConfigError'
    this.issues = issues
  }
}


const HOST_PATTERN = /^(?:\[[0-9a-fA-F:.]+\]|[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?::(\d{1,5}))?$/
const FORBIDDEN_DATABASE_NAME_CHARS = /[/\\. "$]/

function findControlCharIndex(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || code === 0x7f || code === 0x2028 || code === 0x2029) return index
  }
  return -1
}
const VALID_PERCENT_ENCODING = /^(?:[^%]|%[0-9a-fA-F]{2})*$/

function stripSurroundingQuotes(value) {
  const trimmed = value.trim()
  const first = trimmed[0]
  return trimmed.length >= 2 && (first === '"' || first === "'") && trimmed.at(-1) === first ? trimmed.slice(1, -1).trim() : trimmed
}

const fail = (reason) => ({ ok: false, reason })

export function analyzeMongoUri(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') return fail('la valeur est vide.')
  const value = uri.trim()

  const controlIndex = findControlCharIndex(value)
  if (controlIndex !== -1) return fail(`contient un retour à la ligne ou un caractère de contrôle (position ${controlIndex + 1}).`)
  if (value[0] === '"' || value[0] === "'") return fail('est entourée de guillemets ; retirez-les.')

  const schemeMatch = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(value)
  if (!schemeMatch) return fail('doit commencer par mongodb:// ou mongodb+srv://.')
  const scheme = schemeMatch[1]
  if (scheme !== 'mongodb' && scheme !== 'mongodb+srv') {
    return fail(scheme.toLowerCase() === 'mongodb' || scheme.toLowerCase() === 'mongodb+srv'
      ? 'le préfixe doit être écrit en minuscules (mongodb:// ou mongodb+srv://).'
      : 'doit commencer par mongodb:// ou mongodb+srv://.')
  }
  const isSrv = scheme === 'mongodb+srv'

  // « hôtes[/base][?paramètres] » ; le premier « ? » démarre toujours les paramètres.
  const rest = value.slice(schemeMatch[0].length)
  const queryIndex = rest.indexOf('?')
  const beforeQuery = queryIndex === -1 ? rest : rest.slice(0, queryIndex)
  const slashIndex = beforeQuery.indexOf('/')
  const authority = slashIndex === -1 ? beforeQuery : beforeQuery.slice(0, slashIndex)
  const rawDatabase = slashIndex === -1 ? '' : beforeQuery.slice(slashIndex + 1)

  const atCount = authority.split('@').length - 1
  if (atCount > 1) return fail("les identifiants contiennent un « @ » non encodé (écrivez %40).")
  if (atCount === 0 && rawDatabase.includes('@')) return fail("les identifiants contiennent un « / » non encodé (écrivez %2F).")

  let hostList = authority
  if (atCount === 1) {
    const at = authority.indexOf('@')
    const userinfo = authority.slice(0, at)
    hostList = authority.slice(at + 1)
    const colonCount = userinfo.split(':').length - 1
    if (userinfo === '' || userinfo.startsWith(':')) return fail("le nom d'utilisateur est vide.")
    if (colonCount > 1) return fail("les identifiants contiennent un « : » non encodé dans le mot de passe (écrivez %3A).")
    if (/[<>[\]#]/.test(userinfo)) {
      return fail('les identifiants contiennent un caractère à encoder (<, >, [, ], #) ; remplacez aussi tout espace réservé comme <password>.')
    }
    if (!VALID_PERCENT_ENCODING.test(userinfo)) return fail('les identifiants contiennent un « % » mal encodé (écrivez %25).')
  }

  const hosts = hostList.split(',')
  if (hostList === '' || hosts.some((host) => host === '')) return fail("l'hôte est absent ou vide.")
  for (const host of hosts) {
    const match = HOST_PATTERN.exec(host)
    if (!match) return fail("l'hôte est invalide (caractères interdits, port non numérique, ou identifiants mal encodés).")
    if (match[1] !== undefined && (Number(match[1]) < 1 || Number(match[1]) > 65535)) return fail('le port est invalide (1 à 65535).')
  }
  if (isSrv) {
    if (hosts.length !== 1) return fail('mongodb+srv:// accepte un seul nom d’hôte.')
    if (hosts[0].includes(':') && !hosts[0].startsWith('[')) return fail('mongodb+srv:// n’accepte pas de port.')
    if (!hosts[0].includes('.')) return fail('mongodb+srv:// exige un nom de domaine complet (ex. cluster0.xxxxx.mongodb.net).')
  }

  let databaseName = rawDatabase
  try {
    databaseName = decodeURIComponent(rawDatabase)
  } catch {
    return fail('le nom de la base est mal encodé.')
  }
  if (FORBIDDEN_DATABASE_NAME_CHARS.test(databaseName) || databaseName.includes('\u0000')) return fail('le nom de la base contient un caractère interdit (/ \\ . espace " $).')
  if (Buffer.byteLength(databaseName) > 63) return fail('le nom de la base dépasse 63 octets.')

  const normalizedHosts = hosts.join(',').toLowerCase()
  return { ok: true, scheme, isSrv, hosts: normalizedHosts, databaseName, identity: `${normalizedHosts}/${databaseName}` }
}

/**
 * Décompose une adresse MongoDB sans jamais exposer les identifiants.
 * @returns {{ hosts: string, databaseName: string, identity: string } | null} null si l'adresse est invalide
 */
export function parseMongoUri(uri) {
  const analysis = analyzeMongoUri(uri)
  if (!analysis.ok) return null
  const { hosts, databaseName, identity } = analysis
  return { hosts, databaseName, identity }
}

export function explainMongoUriProblem(uri) {
  const analysis = analyzeMongoUri(uri)
  return analysis.ok ? null : analysis.reason
}

/**
 * Remplace les identifiants d'une adresse MongoDB par « *** » (journaux, messages).
 * Tout ce qui se trouve entre « // » et le DERNIER « @ » précédant les paramètres est masqué, même si le mot de passe
 * contient un « @ » ou un « / » non encodé.
 */
export function redactMongoUri(uri) {
  if (typeof uri !== 'string') return ''
  const match = /^([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^?]*)@/.exec(uri.trim())
  return match ? `${match[1]}***@${uri.trim().slice(match[0].length)}` : uri
}

export function isTestDatabaseName(name) {
  return typeof name === 'string' && /(^|[-_.])tests?($|[-_.])/i.test(name)
}

/**
 * Contrôles d'une adresse de base de TEST. Retourne la liste des problèmes (vide = utilisable).
 * @param {string} uri adresse de la base de test
 * @param {string} [otherUri] adresse de la base de développement/production, qui ne doit pas être la même
 */
export function getTestDatabaseIssues(uri, otherUri) {
  const analysis = analyzeMongoUri(uri)
  if (!analysis.ok) return [`n'est pas une adresse MongoDB valide : ${analysis.reason}`]
  const parsed = analysis

  const issues = []
  if (!parsed.databaseName) issues.push('doit préciser un nom de base (mongodb://hôte/nom_de_la_base).')
  else if (!isTestDatabaseName(parsed.databaseName)) {
    issues.push('le nom de la base de test doit contenir le mot « test » (ex. duo_capital_test).')
  }
  const other = parseMongoUri(otherUri)
  if (other && other.identity === parsed.identity) issues.push('ne doit pas être identique à DATABASE_URL.')
  return issues
}

export function assertSafeTestDatabaseUri(uri, otherUri) {
  const issues = getTestDatabaseIssues(uri, otherUri)
  if (issues.length > 0) {
    throw new ConfigError(issues.map((message) => ({ variable: 'TEST_DATABASE_URL', message })))
  }
}

/* ---------- Adresses du frontend (CORS) ---------- */

// « http://localhost:5173/ » -> « http://localhost:5173 » ; retourne null si ce n'est pas une origine http(s) valide.
function normalizeOrigin(rawOrigin) {
  try {
    const url = new URL(rawOrigin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) return null
    return url.origin
  } catch {
    return null
  }
}


const ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'TEST_DATABASE_URL',
  'FRONTEND_URL',
  'LOG_LEVEL',
  'JWT_ACCESS_SECRET',
  'ACCESS_TOKEN_TTL_MINUTES',
  'REFRESH_TOKEN_TTL_DAYS',
  'COOKIE_SAME_SITE',
  'FUND_START_PERIOD',
  'TRUST_PROXY',
  'MONGO_MAX_POOL_SIZE',
]

const envSchema = z.object({
  NODE_ENV: z.enum(ENVIRONMENTS).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  DATABASE_URL: z.string().optional(),
  TEST_DATABASE_URL: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(DEFAULT_ACCESS_TOKEN_TTL_MINUTES),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(DEFAULT_REFRESH_TOKEN_TTL_DAYS),
  COOKIE_SAME_SITE: z.enum(COOKIE_SAME_SITE_VALUES).default('lax'),
  FUND_START_PERIOD: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(MAX_TRUSTED_PROXIES).default(0),
  MONGO_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(MAX_MONGO_POOL_SIZE).default(DEFAULT_MONGO_MAX_POOL_SIZE),
})

const SCHEMA_MESSAGES = {
  NODE_ENV: `doit valoir ${ENVIRONMENTS.join(', ')}.`,
  PORT: 'doit être un nombre entier entre 1 et 65535.',
  LOG_LEVEL: `doit valoir ${LOG_LEVELS.join(', ')}.`,
  ACCESS_TOKEN_TTL_MINUTES: 'doit être un nombre entier de minutes entre 1 et 60.',
  REFRESH_TOKEN_TTL_DAYS: 'doit être un nombre entier de jours entre 1 et 90.',
  COOKIE_SAME_SITE: `doit valoir ${COOKIE_SAME_SITE_VALUES.join(', ')}.`,
  TRUST_PROXY: `doit être le nombre de proxys de confiance devant l'API : un entier entre 0 et ${MAX_TRUSTED_PROXIES} (0 = aucun).`,
  MONGO_MAX_POOL_SIZE: `doit être un nombre entier entre 1 et ${MAX_MONGO_POOL_SIZE}.`,
}

function pickEnv(source) {
  const picked = {}
  for (const key of ENV_KEYS) {
    const value = source?.[key]
    if (typeof value === 'string' && value.trim() !== '') picked[key] = stripSurroundingQuotes(value)
  }
  return picked
}

/**
 * Analyse et valide la configuration. Fonction pure : ne lit ni process.env ni le fichier .env.
 * @param {Record<string, string | undefined>} source variables d'environnement
 * @returns configuration immuable
 * @throws {ConfigError} si une variable est absente ou invalide
 */
export function parseEnv(source) {
  const parsed = envSchema.safeParse(pickEnv(source))
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => {
        const variable = String(issue.path[0] ?? 'ENV')
        return { variable, message: SCHEMA_MESSAGES[variable] ?? 'valeur invalide.' }
      }),
    )
  }

  const env = parsed.data
  const issues = []
  const addIssue = (variable, message) => issues.push({ variable, message })
  const isProduction = env.NODE_ENV === 'production'
  const isTest = env.NODE_ENV === 'test'

  // Origines CORS autorisées.
  const rawOrigins = env.FRONTEND_URL ?? (isProduction ? '' : DEFAULT_FRONTEND_URL)
  let frontendOrigins = []
  if (!rawOrigins) {
    addIssue('FRONTEND_URL', "est obligatoire en production (adresse du frontend autorisée par CORS).")
  } else {
    frontendOrigins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean).map(normalizeOrigin)
    if (frontendOrigins.length === 0 || frontendOrigins.includes(null)) {
      frontendOrigins = []
      addIssue('FRONTEND_URL', 'doit contenir une ou plusieurs adresses http(s) valides, sans « * » ni chemin (ex. http://localhost:5173).')
    }
  }

  // Base de données : en test, TOUJOURS la base de test ; sinon DATABASE_URL, qui ne doit jamais ressembler à une base de test.
  let databaseUrl = ''
  if (isTest) {
    if (!env.TEST_DATABASE_URL) {
      addIssue('TEST_DATABASE_URL', "est obligatoire quand NODE_ENV=test (les tests n'utilisent jamais DATABASE_URL).")
    } else {
      getTestDatabaseIssues(env.TEST_DATABASE_URL, env.DATABASE_URL).forEach((message) => addIssue('TEST_DATABASE_URL', message))
      databaseUrl = env.TEST_DATABASE_URL
    }
  } else if (!env.DATABASE_URL) {
    addIssue('DATABASE_URL', 'est obligatoire (adresse de la base MongoDB, ex. mongodb://127.0.0.1:27017/duo_capital_dev?replicaSet=rs0).')
  } else {
    const parsedUri = analyzeMongoUri(env.DATABASE_URL)
    if (!parsedUri.ok) {
      addIssue('DATABASE_URL', `n'est pas une adresse MongoDB valide : ${parsedUri.reason}`)
    } else {
      if (!parsedUri.databaseName) addIssue('DATABASE_URL', 'doit préciser un nom de base (mongodb://hôte/nom_de_la_base).')
      if (isTestDatabaseName(parsedUri.databaseName)) {
        addIssue('DATABASE_URL', 'vise une base dont le nom contient « test » : cette base est réservée aux tests.')
      }
      if (env.TEST_DATABASE_URL && parseMongoUri(env.TEST_DATABASE_URL)?.identity === parsedUri.identity) {
        addIssue('DATABASE_URL', 'ne doit pas être identique à TEST_DATABASE_URL.')
      }
      databaseUrl = env.DATABASE_URL
    }
  }

  // Secret JWT : obligatoire, assez long et jamais le modèle de .env.example laissé tel quel.
  const jwtSecret = env.JWT_ACCESS_SECRET ?? ''
  if (!jwtSecret) {
    addIssue('JWT_ACCESS_SECRET', `est obligatoire (au moins ${MIN_JWT_SECRET_LENGTH} caractères aléatoires, voir README pour le générer).`)
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    addIssue('JWT_ACCESS_SECRET', `est trop court : au moins ${MIN_JWT_SECRET_LENGTH} caractères sont exigés.`)
  } else if (/change[_-]?me/i.test(jwtSecret) || new Set(jwtSecret).size < 10) {
    addIssue('JWT_ACCESS_SECRET', 'est un modèle ou une valeur trop prévisible : générez un vrai secret aléatoire.')
  }

  if (env.FUND_START_PERIOD && !isValidPeriod(env.FUND_START_PERIOD)) {
    addIssue('FUND_START_PERIOD', 'doit être un mois au format AAAA-MM (ex. 2026-01).')
  }

  // Cookies : « Secure » en production ; SameSite=None n'a de sens (et n'est accepté par les navigateurs) qu'avec Secure.
  const cookieSecure = isProduction
  if (env.COOKIE_SAME_SITE === 'none' && !cookieSecure) {
    addIssue('COOKIE_SAME_SITE', "« none » exige HTTPS (cookies Secure) : réservé à la production.")
  }

  if (issues.length > 0) throw new ConfigError(issues)

  // Le secret JWT est non énumérable : il n'apparaît ni dans JSON.stringify(config) ni dans une copie par « ... ».
  const auth = {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    maxFailedLogins: MAX_FAILED_LOGINS,
    lockDurationMs: ACCOUNT_LOCK_DURATION_MS,
    loginRateLimit: Object.freeze({ windowMs: LOGIN_RATE_LIMIT_WINDOW_MS, max: LOGIN_RATE_LIMIT_MAX_FAILURES }),
    sensitiveActionRateLimit: Object.freeze({ windowMs: SENSITIVE_RATE_LIMIT_WINDOW_MS, max: SENSITIVE_RATE_LIMIT_MAX_FAILURES }),
  }
  Object.defineProperty(auth, 'jwtSecret', { value: jwtSecret, enumerable: false })

  const databaseName = parseMongoUri(databaseUrl).databaseName
  return Object.freeze({
    env: env.NODE_ENV,
    isProduction,
    isTest,
    isDevelopment: env.NODE_ENV === 'development',
    port: env.PORT,
    // Nombre de proxys inverses de confiance (0 = aucun) : seul ce réglage permet de lire l'adresse IP réelle du client.
    trustProxy: env.TRUST_PROXY,
    logLevel: env.LOG_LEVEL ?? (isTest ? 'silent' : isProduction ? 'info' : 'debug'),
    frontendOrigins: Object.freeze(frontendOrigins),
    database: Object.freeze({
      url: databaseUrl,
      name: databaseName,
      redactedUrl: redactMongoUri(databaseUrl),
      // Les transactions exigent un replica set : refus de démarrer sans lui en production.
      requireReplicaSet: isProduction,
      maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    }),
    rateLimit: Object.freeze({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_REQUESTS }),
    auth: Object.freeze(auth),
    cookies: Object.freeze({ secure: cookieSecure, sameSite: env.COOKIE_SAME_SITE }),
    fund: Object.freeze({ startPeriod: env.FUND_START_PERIOD ?? null }),
  })
}

/**
 * Charge le fichier backend/.env dans process.env (sans écraser les variables déjà définies).
 * À appeler uniquement au démarrage du serveur, jamais depuis les tests.
 */
export function loadDotenv() {
  const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')
  return dotenv.config({ path: envFilePath })
}
