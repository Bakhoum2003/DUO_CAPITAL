/** Titre du tableau de bord : nom complet de l'associé connecté (réponse du serveur), suivi de 👋. */
export function buildWelcomeTitle(user) {
  return `Bienvenue, ${user.fullName} 👋`
}
