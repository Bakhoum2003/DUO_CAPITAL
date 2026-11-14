import { useState } from 'react'
import { PERIOD_OPTIONS, validateCustomRange } from '../../utils/dashboardViewModel'

/**
 * Sélecteur de période (Aujourd'hui, Semaine, Mois, Trimestre, Année, Tout, Personnalisé).
 * Props : filter { period, from, to }, onChange(filter), disabled.
 */
function PeriodFilter({ filter, onChange, disabled = false }) {
  const [draft, setDraft] = useState({ from: filter.from, to: filter.to })
  const [showCustom, setShowCustom] = useState(filter.period === 'custom')
  const [rangeError, setRangeError] = useState('')

  const choose = (period) => {
    setRangeError('')
    if (period === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onChange({ period, from: '', to: '' })
  }

  const applyCustom = () => {
    const message = validateCustomRange(draft.from, draft.to)
    setRangeError(message ?? '')
    if (!message) onChange({ period: 'custom', from: draft.from, to: draft.to })
  }

  const isActive = (key) => (key === 'custom' ? showCustom : !showCustom && filter.period === key)
  const inputClasses = 'h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30'

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Période affichée" className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            aria-pressed={isActive(option.key)}
            onClick={() => choose(option.key)}
            className={`h-10 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:opacity-60 ${
              isActive(option.key) ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink hover:bg-brand-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-ink">
            Du
            <input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className={`${inputClasses} ml-2`} />
          </label>
          <label className="text-sm font-semibold text-ink">
            Au
            <input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className={`${inputClasses} ml-2`} />
          </label>
          <button type="button" onClick={applyCustom} disabled={disabled} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
            Appliquer
          </button>
          {rangeError && <p role="alert" className="w-full text-sm font-medium text-danger-500">{rangeError}</p>}
        </div>
      )}
    </div>
  )
}

export default PeriodFilter
