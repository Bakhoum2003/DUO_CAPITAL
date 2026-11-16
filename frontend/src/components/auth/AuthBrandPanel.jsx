import { CheckIcon } from '../../icons'
import Logo from '../common/Logo'
import BrandWave from './illustrations/BrandWave'
import FistBumpIllustration from './illustrations/FistBumpIllustration'
import GrowthIllustration from './illustrations/GrowthIllustration'


const ILLUSTRATIONS = {
  growth: {
    Component: GrowthIllustration,
    wrapperClassName: '',
    imageClassName: 'w-full max-w-[19rem]',
  },
  fistBump: {
    Component: FistBumpIllustration,
    wrapperClassName: '-mx-9',
    imageClassName: 'w-full',
  },
}

/**
 * Panneau vert de marque (partie gauche des pages d'authentification).
 * Sur mobile et tablette, il devient une bannière compacte (logo + slogan).
 */
function AuthBrandPanel({ title, highlightedTitle, description, features, illustration }) {
  const { Component: Illustration, wrapperClassName, imageClassName } = ILLUSTRATIONS[illustration]

  return (
    <aside className="relative overflow-hidden bg-gradient-to-b from-brand-800 via-brand-700 to-brand-500 text-white">
      {/* Bannière compacte : mobile et tablette */}
      <div className="flex justify-center px-6 pb-12 pt-7 lg:hidden">
        <Logo orientation="horizontal" size="md" />
      </div>

      {/* Panneau complet : ordinateur */}
      <div className="hidden min-h-[44rem] flex-col px-9 pb-0 pt-10 lg:flex">
        <Logo orientation="vertical" size="lg" />

        <h2 className="mt-12 text-4xl font-extrabold leading-tight tracking-tight">
          {title}
          <span className="block text-brand-400">{highlightedTitle}</span>
        </h2>

        {description && (
          <p className="mt-5 max-w-xs text-xl leading-snug text-white/95">{description}</p>
        )}

        {features.length > 0 && (
          <ul className="mt-8 space-y-3.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-base">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-400">
                  <CheckIcon className="h-4 w-4 text-white" aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        )}

        <div className={`relative z-10 mt-auto flex justify-center pb-16 pt-6 ${wrapperClassName}`}>
          <Illustration className={imageClassName} />
        </div>
      </div>

      <BrandWave className="absolute inset-x-0 bottom-0 h-8 w-full lg:h-20" />
    </aside>
  )
}

export default AuthBrandPanel
