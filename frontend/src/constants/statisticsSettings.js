
export const PERIOD_OPTIONS = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: '3months', label: '3 derniers mois' },
  { value: '6months', label: '6 derniers mois' },
  { value: 'year', label: 'Cette année' },
  { value: 'all', label: 'Toute la période' },
  { value: 'custom', label: 'Période personnalisée' },
]

export const DEFAULT_PERIOD = 'all'

export const CHART_COLORS = {
  contributions: '#0c8236',
  investments: '#7c3aed',
  expenses: '#e11d2a',
  revenues: '#0891b2',
  result: '#0c8236',
  loss: '#e11d2a',
  associates: ['#0c8236', '#e11d2a'],
  expenseCategories: ['#0c8236', '#7c3aed', '#e11d2a', '#0891b2', '#f59e0b', '#64748b'],
}

export const EVOLUTION_SERIES = [
  { key: 'contributions', label: 'Cotisations', color: CHART_COLORS.contributions },
  { key: 'investments', label: 'Investissements', color: CHART_COLORS.investments },
  { key: 'expenses', label: 'Dépenses', color: CHART_COLORS.expenses },
  { key: 'revenues', label: 'Recettes', color: CHART_COLORS.revenues },
]

export const PERFORMANCE_SERIES = [
  { key: 'invested', label: 'Investi', color: CHART_COLORS.investments },
  { key: 'expenses', label: 'Dépenses', color: CHART_COLORS.expenses },
  { key: 'revenues', label: 'Recettes', color: CHART_COLORS.revenues },
  { key: 'result', label: 'Résultat', color: CHART_COLORS.result },
]

export const UNCATEGORIZED_EXPENSE_LABEL = 'Autre dépense'
