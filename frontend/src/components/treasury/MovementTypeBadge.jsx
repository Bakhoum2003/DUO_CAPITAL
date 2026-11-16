import { getTypeMeta } from '../../utils/treasuryViewModel'
import StatusBadge from '../common/StatusBadge'

function MovementTypeBadge({ type }) {
  const { label, tone } = getTypeMeta(type)
  return <StatusBadge label={label} tone={tone} />
}

export default MovementTypeBadge
