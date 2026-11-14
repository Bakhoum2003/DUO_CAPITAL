/**
 * Utilisateur affiché dans l'interface, construit uniquement à partir de la réponse du serveur
 * { id, name, email, partnerNumber }. Aucun rôle : les deux associés ont exactement les mêmes droits.
 */
export function toCurrentUserView(user) {
  const fullName = String(user.name ?? '').trim()
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0].toUpperCase())
    .join('')

  return {
    id: user.id,
    fullName,
    initials,
    email: user.email,
    partnerNumber: user.partnerNumber,
    role: `Associé n°${user.partnerNumber}`,
  }
}
