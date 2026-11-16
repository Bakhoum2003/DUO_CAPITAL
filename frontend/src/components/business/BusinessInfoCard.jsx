import { CircleInfoIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

function BusinessInfoCard({ categoryLabel, launchDate, responsibleName, initialInvestment, description, cashBalance }) {
  return (
    <section className={CARD_CLASSES} aria-label="Informations générales">
      <SectionHeader icon={CircleInfoIcon} title="Informations générales" />

      <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-ink-soft">Catégorie</dt>
          <dd className="font-semibold text-ink">{categoryLabel}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Date de lancement</dt>
          <dd className="font-semibold text-ink">{formatShortDate(launchDate)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Associé responsable</dt>
          <dd className="font-semibold text-ink">{responsibleName || 'Non précisé'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Investissement initial</dt>
          <dd className="font-semibold text-ink">{formatCurrency(initialInvestment)}</dd>
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <dt className="text-ink-soft">Description</dt>
          <dd className="text-ink">{description || 'Aucune description.'}</dd>
        </div>
      </dl>

      <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm text-ink-soft">
        Le résultat financier (recettes − dépenses − total investi) n’est pas la trésorerie : l’argent disponible
        dans ce business est actuellement de{' '}
        <span className="font-bold text-ink">{formatCurrency(cashBalance)}</span>. Les bénéfices ne sont jamais
        répartis automatiquement : les deux associés décident ensemble de leur partage.
      </p>
    </section>
  )
}

export default BusinessInfoCard
