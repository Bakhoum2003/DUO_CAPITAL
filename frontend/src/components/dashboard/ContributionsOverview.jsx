import { CalendarDaysIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { TONE_STYLES } from '../../constants/toneStyles'
import { SITUATION_LABELS, formatPercent } from '../../utils/dashboardViewModel'
import { formatCurrency } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

/** Cotisations : attendu / versé / restant, pour chaque associé. Le restant n'est jamais supposé payé. */
function ContributionsOverview({ contributions }) {
  const available = contributions.expectedAvailable
  return (
    <section className={CARD_CLASSES} aria-label="Cotisations des associés">
      <SectionHeader icon={CalendarDaysIcon} title="Cotisations des associés" badgeLabel={`${formatCurrency(contributions.monthlyTargetPerPartner)} / mois`} />
      {!available && <p className="mb-3 text-sm text-ink-soft">{contributions.unavailableReason}</p>}
      <ul className="space-y-4">
        {contributions.partners.map((partner) => {
          const situation = SITUATION_LABELS[partner.situation] ?? SITUATION_LABELS.NOT_AVAILABLE
          const styles = TONE_STYLES[situation.tone]
          return (
            <li key={partner.partnerId} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-ink">{partner.name}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.tile} ${styles.icon}`}>{situation.label}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div><dt className="text-ink-soft">Versé (total)</dt><dd className="font-semibold text-ink">{formatCurrency(partner.paidToDate)}</dd></div>
                <div><dt className="text-ink-soft">Attendu</dt><dd className="font-semibold text-ink">{available ? formatCurrency(partner.expected) : '—'}</dd></div>
                <div><dt className="text-ink-soft">Restant</dt><dd className="font-semibold text-ink">{available ? formatCurrency(partner.remaining) : '—'}</dd></div>
                <div><dt className="text-ink-soft">Mois payés</dt><dd className="font-semibold text-ink">{available ? `${partner.paidMonths} / ${contributions.monthsCount}` : '—'}</dd></div>
              </dl>
              {available && (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(partner.realizationRate)} aria-label={`Réalisation de ${partner.name}`}>
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, partner.realizationRate)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">Réalisation : {formatPercent(partner.realizationRate)}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default ContributionsOverview
