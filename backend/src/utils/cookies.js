import { ACCESS_COOKIE_NAME, ACCESS_COOKIE_PATH, REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../config/constants.js'

/** Lit l'en-tête Cookie : { nom: valeur }. La première occurrence d'un nom l'emporte. */
export function parseCookies(header) {
  const cookies = {}
  if (typeof header !== 'string' || header === '') return cookies

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    if (!name || name in cookies) continue
    let value = part.slice(separator + 1).trim()
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1)
    try {
      cookies[name] = decodeURIComponent(value)
    } catch {
      cookies[name] = value
    }
  }
  return cookies
}

// Attributs communs : HttpOnly (illisible par JavaScript), Secure en production, SameSite selon la configuration.
function baseOptions(cookiesConfig, path) {
  return { httpOnly: true, secure: cookiesConfig.secure, sameSite: cookiesConfig.sameSite, path }
}

/**
 * Pose les deux cookies d'authentification :
 * - jeton d'accès, envoyé uniquement à l'API (/api) ;
 * - refresh token, envoyé uniquement aux routes d'authentification (/api/auth).
 * Les jetons ne sont jamais renvoyés dans le corps JSON.
 */
export function setAuthCookies(res, { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt }, cookiesConfig, now = new Date()) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, { ...baseOptions(cookiesConfig, ACCESS_COOKIE_PATH), maxAge: accessExpiresAt.getTime() - now.getTime() })
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...baseOptions(cookiesConfig, REFRESH_COOKIE_PATH), maxAge: refreshExpiresAt.getTime() - now.getTime() })
}

/** Supprime les cookies d'authentification (mêmes attributs que lors de la création, sinon le navigateur les garde). */
export function clearAuthCookies(res, cookiesConfig) {
  res.clearCookie(ACCESS_COOKIE_NAME, baseOptions(cookiesConfig, ACCESS_COOKIE_PATH))
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions(cookiesConfig, REFRESH_COOKIE_PATH))
}
