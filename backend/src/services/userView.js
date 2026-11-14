/**
 * Vue d'un associé exposée par l'API : jamais d'empreinte de mot de passe, de compteur d'échecs, de verrou
 * ni d'information de session. Les deux associés ont exactement la même vue (aucun rôle, aucune hiérarchie).
 */
export function toPartnerView(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    partnerNumber: user.partnerNumber,
    status: user.status,
    lastLoginAt: user.lastLoginAt ?? null,
  }
}
