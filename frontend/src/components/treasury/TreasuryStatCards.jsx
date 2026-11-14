import { ArrowTrendDownIcon, ArrowTrendUpIcon, BuildingColumnsIcon, CoinsIcon, ReceiptIcon } from '../../icons'
import { TONE_STYLES } from '../../constants/toneStyles'
import SummaryCard from '../dashboard/SummaryCard'

const ICONS = { balance: BuildingColumnsIcon, inflow: ArrowTrendUpIcon, outflow: ArrowTrendDownIcon, contributions: CoinsIcon, revenues: ReceiptIcon }

/** Carte « Investissements et dépenses » : deux montants distincts dans un même cadre. Props : rows [{ id, label, amountLabel, count }]. */
function SpendingCard({ rows }) {
  const styles = TONE_STYLES.red
  return (
    <article className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 pb-5 ${styles.surface} ${styles.border}`}>
      <ArrowTrendDownIcon className={`h-10 w-10 shrink-0 ${styles.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-ink">Investissements et dépenses</h3>
        <dl className="mt-1 space-y-1">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt className="text-sm text-ink-soft">{row.label} <span className="text-xs">({row.count})</span></dt>
              <dd className="text-base font-extrabold tracking-tight text-ink">{row.amountLabel}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1 text-sm text-ink-soft">Deux catégories distinctes</p>
      </div>
    </article>
  )
}

/** Cartes de synthèse (chiffres de l'API). Props : cards [{ id, title, valueLabel, footnote, tone }], spendingRows. */
function TreasuryStatCards({ cards, spendingRows }) {
  return (
    <section aria-label="Synthèse de la trésorerie" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <SummaryCard key={card.id} title={card.title} valueLabel={card.valueLabel} footnote={card.footnote} tone={card.tone} icon={ICONS[card.id] ?? BuildingColumnsIcon} />
      ))}
      <SpendingCard rows={spendingRows} />
    </section>
  )
}

export default TreasuryStatCards
