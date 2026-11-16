import { ArrowRightIcon, ArrowTrendDownIcon, ArrowTrendUpIcon } from '../../icons'
import { TONE_STYLES } from '../../constants/toneStyles'
import { formatCurrency, formatSignedAmount } from '../../utils/formatters'

const TREND_ICONS = { up: ArrowTrendUpIcon, down: ArrowTrendDownIcon, flat: ArrowRightIcon, new: ArrowTrendUpIcon }

function getVariationText(variation) {
  if (!variation) return 'Pas de comparaison'
  if (variation.trend === 'new') return 'Nouveau (rien sur la période précédente)'
  if (variation.trend === 'flat') return 'Stable vs période précédente'
  return `${variation.percent > 0 ? '+' : ''}${variation.percent} % vs période précédente`
}

function StatisticsKpiCard({ title, amount, isSigned = false, icon: Icon, tone, variation, isNeutralTrend = false, footnote }) {
  const styles = TONE_STYLES[tone]
  const TrendIcon = variation ? TREND_ICONS[variation.trend] : null
  const trendColor =
    isNeutralTrend || !variation || variation.trend === 'flat'
      ? 'text-ink-soft'
      : variation.trend === 'down'
        ? 'text-danger-600'
        : 'text-brand-600'
  const valueLabel = isSigned && amount !== 0 ? `${formatSignedAmount(amount)} FCFA` : formatCurrency(amount)

  return (
    <article className={`flex min-w-0 flex-col gap-2 rounded-2xl border p-4 ${styles.surface} ${styles.border}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-9 w-9 shrink-0 ${styles.icon}`} aria-hidden="true" />
        <h3 className="min-w-0 text-sm font-semibold text-ink">{title}</h3>
      </div>
      <p className="break-words text-xl font-extrabold tracking-tight text-ink 2xl:text-2xl">{valueLabel}</p>
      <p className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
        {TrendIcon && <TrendIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>{getVariationText(variation)}</span>
      </p>
      {footnote && <p className="text-xs text-ink-soft">{footnote}</p>}
    </article>
  )
}

export default StatisticsKpiCard
