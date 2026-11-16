import { getStatusMeta } from '../../utils/activitiesViewModel'
import StatusBadge from '../common/StatusBadge'

function ActivityStatusBadge({ status }) {
  const { label, tone } = getStatusMeta(status)
  return <StatusBadge label={label} tone={tone} />
}

export default ActivityStatusBadge
