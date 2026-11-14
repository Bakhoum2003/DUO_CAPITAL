import { ArrowLeftIcon, PenIcon, TrashIcon } from '../../icons'
import { Link } from 'react-router-dom'
import { getBusinessCategory } from '../../constants/businessSettings'
import { BUSINESS_STATUSES } from '../../constants/statusStyles'
import { ROUTES } from '../../routes/routePaths'
import ActionButton from '../common/ActionButton'
import StatusBadge from '../common/StatusBadge'
import BusinessCategoryIcon from './BusinessCategoryIcon'

/**
 * En-tête de la page de détails : retour à la liste, nom, catégorie, statut,
 * et boutons « Modifier » / « Supprimer ».
 *
 * Props :
 * - name : nom du business
 * - category : valeur de catégorie
 * - status : 'ongoing' ou 'completed'
 * - onEdit : fonction appelée au clic sur « Modifier »
 * - onDelete : fonction appelée au clic sur « Supprimer »
 */
function BusinessDetailsHeader({ name, category, status, onEdit, onDelete }) {
  const statusStyle = BUSINESS_STATUSES[status]

  return (
    <div>
      <Link
        to={ROUTES.BUSINESS}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Retour aux business
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <BusinessCategoryIcon category={category} size="lg" />
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-ink">{name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">{getBusinessCategory(category).label}</span>
              <StatusBadge label={statusStyle.label} tone={statusStyle.tone} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3">
          <ActionButton label="Modifier" icon={PenIcon} variant="secondary" onClick={onEdit} />
          <ActionButton label="Supprimer" icon={TrashIcon} variant="secondary" onClick={onDelete} />
        </div>
      </div>
    </div>
  )
}

export default BusinessDetailsHeader
