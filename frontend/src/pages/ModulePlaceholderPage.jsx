import { ArrowLeftIcon, PersonDiggingIcon } from '../icons'
import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION_ITEMS } from '../constants/navigationItems'
import { CARD_CLASSES } from '../constants/uiClasses'
import { ROUTES } from '../routes/routePaths'

function ModulePlaceholderPage() {
  const { pathname } = useLocation()
  const navigationItem = NAVIGATION_ITEMS.find((item) => item.to === pathname)
  const ModuleIcon = navigationItem?.icon ?? PersonDiggingIcon

  return (
    <section className={`${CARD_CLASSES} flex flex-col items-center px-6 py-16 text-center`}>
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <ModuleIcon className="h-10 w-10" aria-hidden="true" />
      </span>

      <h2 className="mt-6 text-2xl font-extrabold text-ink">{navigationItem?.label ?? 'Module'}</h2>
      <p className="mt-2 text-lg font-semibold text-brand-700">Module en cours de développement</p>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        Cette section sera bientôt disponible. Vous pouvez continuer à utiliser le tableau de bord.
      </p>

      <Link
        to={ROUTES.DASHBOARD}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
      >
        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        Retour au tableau de bord
      </Link>
    </section>
  )
}

export default ModulePlaceholderPage
