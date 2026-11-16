import { Outlet } from 'react-router-dom'
import useBusinesses from '../../hooks/useBusinesses'

function BusinessModuleLayout() {
  const businessStore = useBusinesses()

  if (businessStore.isLoading) {
    return <p className="py-16 text-center text-ink-soft">Chargement des business…</p>
  }

  return <Outlet context={businessStore} />
}

export default BusinessModuleLayout
