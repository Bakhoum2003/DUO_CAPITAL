import { AwardIcon, CartShoppingIcon, MoneyBillTransferIcon, MoneyBillWaveIcon, PiggyBankIcon, RocketIcon } from '../icons'

// Les six catégories de mouvements de l'Historique.
// `direction` : 'in' (entrée d'argent), 'out' (sortie de trésorerie) ou 'none' (résultat calculé).
// Un bénéfice calculé est 'none' : il n'est jamais compté dans les entrées (pas de double comptage).
export const HISTORY_TYPES = {
  contribution: {
    label: 'Cotisation',
    pluralLabel: 'Cotisations reçues',
    icon: PiggyBankIcon,
    direction: 'in',
    sourceLabel: 'Module Cotisations',
  },
  investment: {
    label: 'Investissement',
    pluralLabel: 'Investissements',
    icon: RocketIcon,
    direction: 'out',
    sourceLabel: 'Module Business',
  },
  expense: {
    label: 'Dépense',
    pluralLabel: 'Dépenses',
    icon: CartShoppingIcon,
    direction: 'out',
    sourceLabel: 'Module Business',
  },
  revenue: {
    label: 'Recette',
    pluralLabel: 'Recettes',
    icon: MoneyBillWaveIcon,
    direction: 'in',
    sourceLabel: 'Module Business',
  },
  withdrawal: {
    label: 'Retrait',
    pluralLabel: 'Retraits',
    icon: MoneyBillTransferIcon,
    direction: 'out',
    sourceLabel: 'Trésorerie',
  },
  profit: {
    label: 'Bénéfice',
    pluralLabel: 'Bénéfices',
    icon: AwardIcon,
    direction: 'none',
    sourceLabel: 'Résultat calculé du module Business',
  },
}

// Sens du mouvement : libellé, signe, teinte du badge (StatusBadge) et couleurs.
export const DIRECTIONS = {
  in: { label: 'Entrée', sign: '+', badgeTone: 'success', tileTone: 'green', textClass: 'text-brand-700' },
  out: { label: 'Sortie', sign: '−', badgeTone: 'danger', tileTone: 'red', textClass: 'text-danger-600' },
  none: { label: 'Résultat calculé', sign: '', badgeTone: 'warning', tileTone: 'violet', textClass: 'text-violet-700' },
}

// Valeur du filtre « activité » pour les mouvements sans activité (cotisations, retraits).
export const NO_BUSINESS_FILTER = '__none__'

export const HISTORY_SORT_OPTIONS = [
  { value: 'date-desc', label: "Date : plus récentes d'abord" },
  { value: 'date-asc', label: "Date : plus anciennes d'abord" },
]
