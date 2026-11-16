import { ArrowUpIcon } from '../../icons'
import { TONE_STYLES } from '../../constants/toneStyles'
import { formatCurrency, formatSignedAmount } from '../../utils/formatters'
import SummaryCardIndicator from './SummaryCardIndicator'

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
        <div className="absolute bottom-3 right-3 xl:max-[1400px]:hidden">
          <SummaryCardIndicator kind={indicator} tone={tone} />
        </div>
      )}
    </article>
  )
}

export default SummaryCard
