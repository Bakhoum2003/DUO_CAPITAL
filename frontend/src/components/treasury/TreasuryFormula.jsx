import { CalculatorIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import SectionHeader from '../common/SectionHeader'

/** « Comment le solde est calculé » : chaque composante du solde avec son effet (+ ou −), telle que fournie par l'API. */
function TreasuryFormula({ rows, balanceLabel, notices }) {
  return (
    <section className={CARD_CLASSES} aria-label="Calcul du solde">
      <SectionHeader icon={CalculatorIcon} title="Comment le solde est calculé" />
      <ul className="divide-y divide-line text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold ${row.increases ? 'bg-brand-100 text-brand-700' : 'bg-danger-50 text-danger-600'}`}>{row.sign}</span>
              <span className="min-w-0 text-ink">{row.label} <span className="text-ink-soft">({row.count})</span></span>
            </span>
            <span className="shrink-0 font-semibold text-ink">{row.amountLabel}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-3 text-base font-extrabold text-ink">
          <span>= Solde disponible</span>
          <span>{balanceLabel}</span>
        </li>
      </ul>
      <p className="mt-2 text-sm text-ink-soft">C’est le solde financier réel du fonds, pas le bénéfice commercial : les recettes ne sont comptées qu’une fois et le capital des cotisations reste distinct des recettes.</p>
      {notices.map((notice) => (
        <p key={notice.code} className="mt-1 text-sm text-ink-soft">{notice.message}</p>
      ))}
    </section>
  )
}

export default TreasuryFormula
