import { contributionsMockData } from '../data/contributionsMockData'

// Service des cotisations : pour l'instant il renvoie les données temporaires locales.
// Au moment de la phase backend, seul le contenu de cette fonction changera (appel HTTP).
// L'ajout, la modification et la suppression sont gérés en mémoire par useContributions
// et seront eux aussi branchés ici plus tard.
export async function getContributions() {
  return contributionsMockData.map((contribution) => ({ ...contribution }))
}
