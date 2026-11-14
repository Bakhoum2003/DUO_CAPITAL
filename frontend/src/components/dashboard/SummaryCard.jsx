import { ArrowUpIcon } from '../../icons'
import { TONE_STYLES } from '../../constants/toneStyles'
import { formatCurrency, formatSignedAmount } from '../../utils/formatters'
import SummaryCardIndicator from './SummaryCardIndicator'

/**
 * Carte de synthèse financière (ex. « Capital disponible 410 000 FCFA »).
 *
 * Props :
 * - title : titre de la carte
 * - amount : montant en FCFA (nombre)
 * - valueLabel : texte affiché à la place du montant (ex. un nombre de business, ou un résultat signé) (optionnel)
 * - icon : composant d'icône Font Awesome (voir src/icons)
 * - tone : teinte de la carte ('green', 'blue', 'red')
 * - trendAmount : variation du mois en FCFA, affichée avec une flèche (optionnel)
 * - footnote : petit texte sous le montant (ex. « (12 mois) ») (optionnel)
 * - indicator : repère visuel à droite ('trend', 'check' ou 'bars') (optionnel)
 */
function SummaryCard({ title, amount, valueLabel, icon: Icon, tone = 'green', trendAmount, footnote, indicator }) {
  const styles = TONE_STYLES[tone]

  return (
    <article
      className={`relative flex min-w-0 items-center gap-3 rounded-2xl border p-4 pb-5 ${styles.surface} ${styles.border}`}
    >
      <Icon className={`h-10 w-10 shrink-0 ${styles.icon}`} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-0.5 text-xl font-extrabold tracking-tight text-ink 2xl:text-2xl">
          {valueLabel ?? formatCurrency(amount)}
        </p>

        {trendAmount !== undefined && (
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-brand-600">
            <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
            {formatSignedAmount(trendAmount)}
          </p>
        )}

        {footnote && <p className="mt-1 text-sm text-ink-soft">{footnote}</p>}
      </div>

      {indicator && (
        // Masqué entre 1280 et 1400 px, où les 4 cartes sont trop étroites pour un repère.
        <div className="absolute bottom-3 right-3 xl:max-[1400px]:hidden">
          <SummaryCardIndicator kind={indicator} tone={tone} />
        </div>
      )}
    </article>
  )
}

export default SummaryCard
