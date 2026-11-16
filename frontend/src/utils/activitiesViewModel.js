
export const PAGE_SIZE = 12
export const MAX_NAME_LENGTH = 100
export const MIN_NAME_LENGTH = 2
export const MAX_DESCRIPTION_LENGTH = 1000
export const MAX_CATEGORY_LENGTH = 60
export const MIN_REASON_LENGTH = 3
export const MAX_REASON_LENGTH = 300
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_FILTERS = Object.freeze({ search: '', status: '', category: '', sort: 'start_desc', page: 1 })

export const STATUS_META = Object.freeze({
  ACTIVE: { label: 'En cours', tone: 'success' },
  SUSPENDED: { label: 'Suspendue', tone: 'warning' },
  COMPLETED: { label: 'Terminée', tone: 'info' },
  ARCHIVED: { label: 'Archivée', tone: 'neutral' },
})

export const getStatusMeta = (status) => STATUS_META[status] ?? { label: 'Statut inconnu', tone: 'neutral' }

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Toutes (hors archivées)' },
  { value: 'ACTIVE', label: 'En cours' },
  { value: 'SUSPENDED', label: 'Suspendues' },
  { value: 'COMPLETED', label: 'Terminées' },
  { value: 'ARCHIVED', label: 'Archivées' },
]

export const SORT_OPTIONS = [
  { value: 'start_desc', label: 'Démarrage : plus récentes' },
  { value: 'start_asc', label: 'Démarrage : plus anciennes' },
  { value: 'name_asc', label: 'Nom : A → Z' },
  { value: 'name_desc', label: 'Nom : Z → A' },
  { value: 'created_desc', label: 'Dernières créées' },
]

export const hasActiveFilters = (filters) => Boolean(filters.search || filters.status || filters.category)

/** Date « AAAA-MM-JJ » réelle (refuse 2026-02-30). */
export function isRealDate(value) {
  if (!DATE.test(value ?? '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function buildActivitiesPath(filters = DEFAULT_FILTERS) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)
  params.set('sort', filters.sort || DEFAULT_FILTERS.sort)
  params.set('page', String(filters.page || 1))
  params.set('pageSize', String(PAGE_SIZE))
  return `/api/v1/activities?${params.toString()}`
}

export const activityPath = (id) => `/api/v1/activities/${encodeURIComponent(id)}`

export function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.day}/${parts.month}/${parts.year} à ${parts.hour}:${parts.minute}`
}


export const emptyFormValues = (todayIso = '') => ({ name: '', description: '', category: '', startDate: todayIso, endDate: '' })

export const formValuesFromActivity = (activity) => ({
  name: activity.name ?? '',
  description: activity.description ?? '',
  category: activity.category ?? '',
  startDate: activity.startDate ?? '',
  endDate: activity.endDate ?? '',
})

export function validateActivityForm(values, { requireEndDate = false, showEndDate = false } = {}) {
  const errors = {}
  const name = values.name.trim()
  if (!name) errors.name = "Le nom de l'activité est obligatoire."
  else if (name.length < MIN_NAME_LENGTH) errors.name = `Le nom doit contenir au moins ${MIN_NAME_LENGTH} caractères.`
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères.`
  if (values.description.length > MAX_DESCRIPTION_LENGTH) errors.description = `La description ne peut pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.`
  if (values.category.trim().length > MAX_CATEGORY_LENGTH) errors.category = `La catégorie ne peut pas dépasser ${MAX_CATEGORY_LENGTH} caractères.`
  if (!values.startDate) errors.startDate = 'La date de démarrage est obligatoire.'
  else if (!isRealDate(values.startDate)) errors.startDate = 'La date de démarrage est invalide.'
  if (showEndDate) {
    if (!values.endDate) {
      if (requireEndDate) errors.endDate = 'Une activité terminée doit avoir une date de fin.'
    } else if (!isRealDate(values.endDate)) errors.endDate = 'La date de fin est invalide.'
    else if (!errors.startDate && values.endDate < values.startDate) errors.endDate = 'La date de fin ne peut pas précéder la date de démarrage.'
  }
  return errors
}

/** Corps de création : uniquement les champs autorisés (jamais de statut, d'auteur ni de montant). */
export function buildCreatePayload(values) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    category: values.category.trim() || null,
    startDate: values.startDate,
  }
}

export function buildUpdatePayload(values, original, { showEndDate = false } = {}) {
  const next = buildCreatePayload(values)
  const payload = {}
  if (next.name !== original.name) payload.name = next.name
  if (next.description !== (original.description ?? '')) payload.description = next.description
  if (next.category !== (original.category ?? null)) payload.category = next.category
  if (next.startDate !== original.startDate) payload.startDate = next.startDate
  if (showEndDate && (values.endDate || null) !== (original.endDate ?? null)) payload.endDate = values.endDate || null
  return payload
}

const FIELD_NAMES = new Set(['name', 'description', 'category', 'startDate', 'endDate', 'reason'])
const CODE_MESSAGES = {
  ACTIVITY_NAME_ALREADY_USED: 'Une activité non archivée porte déjà ce nom.',
  ACTIVITY_NOT_FOUND: "Cette activité n'existe pas ou n'existe plus.",
  ACTIVITY_ARCHIVED: 'Une activité archivée ne peut plus être modifiée.',
  ACTIVITY_CONFLICT: "L'activité a été modifiée entre-temps. Actualisez la page puis réessayez.",
  INVALID_STATUS_TRANSITION: "Cette action n'est pas possible dans l'état actuel de l'activité. Actualisez la page.",
  START_DATE_AFTER_OPERATIONS: "La date de démarrage ne peut pas être postérieure à la première opération de l'activité.",
  END_DATE_BEFORE_OPERATIONS: "La date de fin ne peut pas être antérieure à la dernière opération de l'activité.",
  END_DATE_IN_FUTURE: 'La date de fin ne peut pas être dans le futur.',
  END_DATE_REQUIRED: 'Une activité terminée doit avoir une date de fin.',
  REOPEN_LIMIT_REACHED: 'Le nombre maximal de réouvertures de cette activité est atteint.',
}

export function describeActivityError(error) {
  const fieldErrors = {}
  for (const item of Array.isArray(error?.fields) ? error.fields : []) {
    const field = String(item.field ?? '')
    if (FIELD_NAMES.has(field) && !fieldErrors[field]) fieldErrors[field] = item.message
  }
  const fromCode = CODE_MESSAGES[error?.code]
  return { message: fromCode ?? error?.message ?? "L'opération a échoué. Réessayez.", fieldErrors }
}


export const ACTION_META = Object.freeze({
  suspend: { kind: 'confirm', label: 'Suspendre', title: 'Suspendre cette activité ?', description: "L'activité sera temporairement arrêtée mais ne sera pas considérée comme terminée. Vous pourrez la réactiver. Aucune opération financière n'est modifiée.", confirmLabel: 'Suspendre', variant: 'primary', success: 'Activité suspendue.' },
  reactivate: { kind: 'confirm', label: 'Réactiver', title: 'Réactiver cette activité ?', description: "L'activité redeviendra « En cours ».", confirmLabel: 'Réactiver', variant: 'primary', success: 'Activité réactivée.' },
  complete: { kind: 'complete', label: 'Terminer', title: 'Terminer cette activité ?', description: "L'activité sera marquée comme terminée à la date choisie. Les opérations financières existantes restent inchangées.", confirmLabel: 'Terminer', variant: 'primary', success: 'Activité terminée.' },
  reopen: { kind: 'reopen', label: 'Rouvrir', title: 'Rouvrir cette activité ?', description: 'Un motif est obligatoire : il sera conservé dans l’historique de l’activité.', confirmLabel: 'Rouvrir', variant: 'primary', success: 'Activité rouverte.' },
  archive: { kind: 'confirm', label: 'Archiver', title: 'Archiver cette activité ?', description: "L'activité restera consultable avec tout son historique financier, mais ne pourra plus être modifiée ni rouverte. Cette action est définitive. Rien n'est supprimé.", confirmLabel: 'Archiver', variant: 'danger', success: 'Activité archivée.' },
})

export const statusActionsOf = (activity) => (activity?.allowedActions ?? []).filter((action) => ACTION_META[action])
export const canEdit = (activity) => (activity?.allowedActions ?? []).includes('edit')

export function buildActionBody(action, { endDate = '', reason = '' } = {}) {
  if (action === 'complete') return endDate ? { endDate } : {}
  if (action === 'reopen') return { reason: reason.trim() }
  return {}
}

export function validateActionInput(action, { endDate = '', reason = '' } = {}, { startDate = '', todayIso = '' } = {}) {
  if (action === 'reopen') {
    const trimmed = reason.trim()
    if (trimmed.length < MIN_REASON_LENGTH) return `Le motif est obligatoire (${MIN_REASON_LENGTH} caractères minimum).`
    if (trimmed.length > MAX_REASON_LENGTH) return `Le motif ne peut pas dépasser ${MAX_REASON_LENGTH} caractères.`
  }
  if (action === 'complete' && endDate) {
    if (!isRealDate(endDate)) return 'La date de fin est invalide.'
    if (startDate && endDate < startDate) return 'La date de fin ne peut pas précéder la date de démarrage.'
    if (todayIso && endDate > todayIso) return 'La date de fin ne peut pas être dans le futur.'
  }
  return null
}


export function buildCountCards(counts) {
  const value = (key) => (counts && Number.isFinite(counts[key]) ? String(counts[key]) : '—')
  return [
    { id: 'total', title: 'Total des activités', valueLabel: value('total'), footnote: 'Archivées comprises', tone: 'violet' },
    { id: 'ACTIVE', title: 'En cours', valueLabel: value('ACTIVE'), footnote: 'Activités actives', tone: 'green' },
    { id: 'SUSPENDED', title: 'Suspendues', valueLabel: value('SUSPENDED'), footnote: 'Temporairement arrêtées', tone: 'orange' },
    { id: 'COMPLETED', title: 'Terminées', valueLabel: value('COMPLETED'), footnote: 'Activités achevées', tone: 'blue' },
    { id: 'ARCHIVED', title: 'Archivées', valueLabel: value('ARCHIVED'), footnote: 'Conservées avec leur historique', tone: 'red' },
  ]
}

export function buildCategoryOptions(categories, selected = '') {
  const list = Array.isArray(categories) ? [...categories] : []
  if (selected && !list.includes(selected)) list.push(selected)
  return [{ value: '', label: 'Toutes les catégories' }, ...list.map((category) => ({ value: category, label: category }))]
}
