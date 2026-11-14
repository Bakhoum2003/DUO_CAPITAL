import { Outlet, useLocation } from 'react-router-dom'
import AuthBackdrop from '../components/auth/AuthBackdrop'
import AuthBrandPanel from '../components/auth/AuthBrandPanel'
import PwaNotices from '../components/pwa/PwaNotices'
import { AUTH_PANEL_CONTENT } from '../constants/authPanelContent'
import { ROUTES } from '../routes/routePaths'

/**
 * Structure commune des pages d'inscription et de connexion :
 * panneau de marque à gauche (contenu selon la page) et formulaire à droite.
 * La page affichée (formulaire) est injectée par React Router via <Outlet />.
 */
function AuthLayout() {
  const { pathname } = useLocation()
  const panelContent = AUTH_PANEL_CONTENT[pathname] ?? AUTH_PANEL_CONTENT[ROUTES.LOGIN]

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface">
      <AuthBackdrop />
      <PwaNotices className="absolute inset-x-0 top-0 z-10 mx-auto w-full max-w-4xl space-y-2 p-3 sm:px-6 lg:px-8" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl shadow-brand-900/10 ring-1 ring-black/5 lg:grid-cols-[1fr_1.05fr]">
          <AuthBrandPanel
            title={panelContent.title}
            highlightedTitle={panelContent.highlightedTitle}
            description={panelContent.description}
            features={panelContent.features}
            illustration={panelContent.illustration}
          />

          <section className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-11 lg:py-10">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  )
}

export default AuthLayout
