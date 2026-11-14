import { BookOpenIcon, BottleWaterIcon, ShirtIcon, StoreIcon, UtensilsIcon } from '../icons'
import { CONTRIBUTION_ASSOCIATES } from './contributionSettings'
import { BUSINESS_STATUSES } from './statusStyles'

// Règles et listes du module Business.
export const MAX_BUSINESS_AMOUNT = 100000000
export const MIN_BUSINESS_DATE = '2020-01-01'
export const MAX_BUSINESS_NAME_LENGTH = 60
export const MAX_BUSINESS_DESCRIPTION_LENGTH = 300
export const MAX_OPERATION_DESCRIPTION_LENGTH = 200

// Catégories d'activité : libellé, icône et teinte (TONE_STYLES) de la carte.
export const BUSINESS_CATEGORIES = [
  { value: 'drinks', label: 'Boissons', icon: BottleWaterIcon, tone: 'blue' },
  { value: 'clothing', label: 'Vêtements', icon: ShirtIcon, tone: 'red' },
  { value: 'food', label: 'Nourriture', icon: UtensilsIcon, tone: 'orange' },
  { value: 'school', label: 'Fournitures scolaires', icon: BookOpenIcon, tone: 'violet' },
  { value: 'other', label: 'Autre activité', icon: StoreIcon, tone: 'green' },
]

export const BUSINESS_STATUS_OPTIONS = Object.entries(BUSINESS_STATUSES).map(([value, status]) => ({
  value,
  label: status.label,
}))

// Les trois types d'opérations financières d'un business.
export const OPERATION_TYPES = {
  investment: {
    label: 'Investissement',
    pluralLabel: 'Investissements',
    addLabel: 'Ajouter un investissement',
    editLabel: "Modifier l'investissement",
    deleteTitle: 'Supprimer cet investissement ?',
    associateLabel: "Associé ayant effectué l'investissement",
    tone: 'info',
  },
  expense: {
    label: 'Dépense',
    pluralLabel: 'Dépenses',
    addLabel: 'Ajouter une dépense',
    editLabel: "Modifier la dépense",
    deleteTitle: 'Supprimer cette dépense ?',
    associateLabel: 'Associé ayant enregistré la dépense',
    tone: 'danger',
  },
  revenue: {
    label: 'Recette',
    pluralLabel: 'Recettes',
    addLabel: 'Ajouter une recette',
    editLabel: "Modifier la recette",
    deleteTitle: 'Supprimer cette recette ?',
    associateLabel: 'Associé ayant enregistré la recette',
    tone: 'success',
  },
}

export const EXPENSE_CATEGORIES = [
  { value: 'goods', label: 'Achat de marchandises' },
  { value: 'transport', label: 'Transport' },
  { value: 'packaging', label: 'Emballage' },
  { value: 'marketing', label: 'Communication et publicité' },
  { value: 'rent', label: 'Location' },
  { value: 'other', label: 'Autre dépense' },
]

export const BUSINESS_SORT_OPTIONS = [
  { value: 'date-desc', label: "Lancement : plus récents d'abord" },
  { value: 'date-asc', label: "Lancement : plus anciens d'abord" },
  { value: 'result-desc', label: 'Résultat : du meilleur au moins bon' },
  { value: 'result-asc', label: 'Résultat : du moins bon au meilleur' },
]

export const RESULT_KIND_LABELS = { profit: 'Bénéfice', loss: 'Perte', 'break-even': 'Équilibre' }

// Les associés (les mêmes que pour les cotisations).
export const BUSINESS_ASSOCIATES = CONTRIBUTION_ASSOCIATES

export function getAssociate(associateId) {
  return BUSINESS_ASSOCIATES.find((associate) => associate.id === associateId) ?? null
}

export function getBusinessCategory(categoryValue) {
  return BUSINESS_CATEGORIES.find((category) => category.value === categoryValue) ?? BUSINESS_CATEGORIES[BUSINESS_CATEGORIES.length - 1]
}
