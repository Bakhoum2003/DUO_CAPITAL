import { Outlet } from 'react-router-dom'
import useBusinesses from '../../hooks/useBusinesses'

/**
 * Structure commune des pages du module Business (liste et détails) : charge les données une seule fois
 * et les transmet à la page affichée (via <Outlet context />), sans passer de contenu en enfant.
 */
function BusinessModuleLayout() {
  const businessStore = useBusinesses()

  if (businessStore.isLoading) {
    return <p className="py-16 text-center text-ink-soft">Chargement des business…</p>
  }

  return <Outlet context={businessStore} />
}

export default BusinessModuleLayout
