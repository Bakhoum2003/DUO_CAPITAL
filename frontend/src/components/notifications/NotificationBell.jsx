import { BellIcon } from '../../icons'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import usePreferences from '../../hooks/usePreferences'
import useReminders from '../../hooks/useReminders'
import { ROUTES } from '../../routes/routePaths'
import { shouldShowReminderBadge } from '../../utils/settingsViewModel'
import { formatCurrency } from '../../utils/formatters'
import ProgressBar from '../common/ProgressBar'

function NotificationBell() {
  const { preferences } = usePreferences()
  const { status, view, errorMessage, refresh } = useReminders()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const handlePointer = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const showBadge = shouldShowReminderBadge(preferences, view)
  const count = view.itemCount

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={showBadge ? `Notifications : ${count} rappel${count > 1 ? 's' : ''} de cotisation` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-full border border-line bg-white p-2.5 text-ink shadow-sm transition hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
      >
        <BellIcon className="h-5 w-5" aria-hidden="true" />
        {showBadge && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[0.65rem] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Rappels de cotisation"
          className="absolute right-0 z-30 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl"
        >
          <h2 className="text-base font-bold text-ink">Rappels de cotisation</h2>

          {status === 'disabled' && (
            <p className="mt-2 text-sm text-ink-soft">Les rappels de cotisation sont désactivés dans vos préférences.</p>
          )}
          {status === 'loading' && <p role="status" className="mt-2 text-sm text-ink-soft">Chargement des rappels…</p>}
          {status === 'error' && (
            <div className="mt-2 space-y-2">
              <p role="alert" className="text-sm text-danger-600">{errorMessage}</p>
              <button type="button" onClick={refresh} className="text-sm font-semibold text-brand-700 underline">Réessayer</button>
            </div>
          )}
          {status === 'ready' && !view.available && (
            <p className="mt-2 text-sm text-ink-soft">{view.unavailableReason || 'Les rappels ne sont pas disponibles pour le moment.'}</p>
          )}
          {status === 'ready' && view.available && view.itemCount === 0 && (
            <p className="mt-2 text-sm text-ink-soft">Aucune cotisation à compléter : tout est à jour.</p>
          )}
          {view.itemCount > 0 && (
            <ul className="mt-3 space-y-3">
              {view.items.map((item) => (
                <li key={item.key} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-bold text-ink">
                    {item.partnerName} · {item.monthLabel}
                  </p>
                  <p className="text-xs text-ink-soft">{item.isCurrent ? 'Mois en cours' : 'Mois précédent à compléter'}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-ink-soft">Objectif</dt><dd className="font-semibold text-ink">{formatCurrency(item.target)}</dd></div>
                    <div><dt className="text-ink-soft">Versé</dt><dd className="font-semibold text-ink">{formatCurrency(item.paid)}</dd></div>
                    <div><dt className="text-ink-soft">Reste</dt><dd className="font-semibold text-danger-600">{formatCurrency(item.remaining)}</dd></div>
                  </dl>
                  <div className="mt-2">
                    <ProgressBar value={item.progressPercent} label={`Progression de ${item.partnerName}, ${item.monthLabel}`} />
                    <p className="mt-1 text-right text-xs text-ink-soft">{item.progressPercent} %</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link
            to={ROUTES.CONTRIBUTIONS}
            onClick={() => setIsOpen(false)}
            className="mt-3 block rounded-xl bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
          >
            Voir les cotisations
          </Link>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
