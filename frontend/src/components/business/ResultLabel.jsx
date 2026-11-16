import { RESULT_KIND_LABELS } from '../../constants/businessSettings'
import { getResultKind } from '../../utils/businessCalculations'
import { formatCurrency, formatSignedAmount } from '../../utils/formatters'

const KIND_CLASSES = {
  profit: 'text-brand-700',
  loss: 'text-danger-600',
  'break-even': 'text-ink',
}

/**
 * Résultat financier d'un business, en couleur : « +10 000 FCFA » (vert), « −2 000 FCFA » (rouge).
 *
 * Props :
 * - showKindLabel : ajoute le mot « Bénéfice », « Perte » ou « Équilibre » après le montant
 */
function ResultLabel({ result, showKindLabel = false }) {
  const kind = getResultKind(result)
  const amountLabel = kind === 'break-even' ? formatCurrency(0) : `${formatSignedAmount(result)} FCFA`

  return (
    <span className={`font-extrabold ${KIND_CLASSES[kind]}`}>
      {amountLabel}
      {showKindLabel && <span className="ml-1.5 text-xs font-semibold uppercase">{RESULT_KIND_LABELS[kind]}</span>}
    </span>
  )
}

export default ResultLabel
