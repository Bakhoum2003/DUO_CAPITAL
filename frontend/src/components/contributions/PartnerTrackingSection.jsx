import { UsersIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency, formatMonthLabel } from '../../utils/formatters'
import Avatar from '../common/Avatar'
import ProgressBar from '../common/ProgressBar'
import SectionHeader from '../common/SectionHeader'

/** Suivi séparé de chaque associé : objectif mensuel, versé (réel, jamais plafonné), restant, progression. Props : partners (voir buildPartnerProgress). */
function PartnerTrackingSection({ partners }) {
  return (
    <section className={CARD_CLASSES} aria-label="Suivi des associés">
      <SectionHeader icon={UsersIcon} title="Suivi des associés" />
      <div className="grid gap-4 lg:grid-cols-2">
        {partners.map((partner, index) => (
          <article key={partner.id} className="rounded-2xl border border-line p-4">
            <div className="flex items-center gap-3">
              <Avatar initials={partner.initials} tone={index % 2 === 0 ? 'green' : 'red'} size="md" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-ink">{partner.name}</h3>
                <p className="text-sm text-ink-soft">Objectif mensuel : {formatCurrency(partner.monthlyTarget)}</p>
              </div>
              <p className="text-lg font-extrabold text-ink">{partner.percentLabel}</p>
            </div>
            <div className="mt-4">
              <ProgressBar value={partner.percent} label={`Progression de ${partner.name}`} tone={partner.isComplete ? 'green' : 'amber'} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-ink-soft">Montant versé</dt><dd className="font-bold text-ink">{formatCurrency(partner.paid)}</dd></div>
              <div><dt className="text-ink-soft">Montant restant</dt><dd className="font-bold text-ink">{partner.remaining == null ? 'Non calculable' : formatCurrency(partner.remaining)}</dd></div>
              {partner.excess > 0 && <div className="col-span-2"><dt className="text-ink-soft">Excédent conservé (non compensé)</dt><dd className="font-bold text-brand-700">{formatCurrency(partner.excess)}</dd></div>}
            </dl>
            {partner.overdueMonths.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-danger-600">
                Mois non réglés : {partner.overdueMonths.map(formatMonthLabel).join(', ')}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export default PartnerTrackingSection
