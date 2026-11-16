const NON_BREAKING_SPACE = '\u00A0'
const numberFormatter = new Intl.NumberFormat('fr-FR')

let thousandsSeparator = NON_BREAKING_SPACE

export function setAmountSeparator(separator) {
  thousandsSeparator = separator
}

// 410000 -> « 410 000 » (espace insécable pour ne jamais couper un nombre).
export function formatNumber(value) {
  return numberFormatter.format(value).replace(/[\u202F\u00A0]/g, thousandsSeparator)
}

export function formatCurrency(value) {
  return `${formatNumber(value)} FCFA`
}

export function formatSignedAmount(value) {
  return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`
}

export function formatCompactAmount(value) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
}

export function formatShortDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function formatLongDate(date = new Date()) {
  const label = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatCompactDate(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
