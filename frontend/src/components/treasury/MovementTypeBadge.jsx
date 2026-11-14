import { getTypeMeta } from '../../utils/treasuryViewModel'
import StatusBadge from '../common/StatusBadge'

/** Badge du type d'un mouvement (Cotisation, Recette commerciale, Investissement, Dépense, Retrait). Props : type (valeur de l'API). */
function MovementTypeBadge({ type }) {
  const { label, tone } = getTypeMeta(type)
  return <StatusBadge label={label} tone={tone} />
}

export default MovementTypeBadge
