import { getStatusMeta } from '../../utils/activitiesViewModel'
import StatusBadge from '../common/StatusBadge'

/** Badge du statut d'une activité (En cours, Suspendue, Terminée, Archivée). Props : status (valeur de l'API). */
function ActivityStatusBadge({ status }) {
  const { label, tone } = getStatusMeta(status)
  return <StatusBadge label={label} tone={tone} />
}

export default ActivityStatusBadge
