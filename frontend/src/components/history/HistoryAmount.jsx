import { DIRECTIONS } from '../../constants/historySettings'
import { formatCurrency } from '../../utils/formatters'

/**
 * Montant d'un mouvement avec son signe et sa couleur : « +15 000 FCFA » (vert), « −5 000 FCFA » (rouge).
 * Un résultat calculé s'affiche sans signe, en violet.
 *
 * Props :
 * - direction : 'in', 'out' ou 'none'
 * - amount : montant (FCFA, positif)
 */
function HistoryAmount({ direction, amount }) {
  const { sign, textClass } = DIRECTIONS[direction]

  return (
    <span className={`whitespace-nowrap font-bold ${textClass}`}>
      {sign}
      {formatCurrency(amount)}
    </span>
  )
}

export default HistoryAmount
