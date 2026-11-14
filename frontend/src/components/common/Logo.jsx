import HandshakeIcon from './HandshakeIcon'

const SIZE_STYLES = {
  md: { icon: 'h-10 w-14', wordmark: 'text-2xl', slogan: 'text-xs' },
  lg: { icon: 'h-24 w-36', wordmark: 'text-5xl', slogan: 'text-xl' },
  sidebar: { icon: 'h-16 w-24', wordmark: 'text-[1.65rem]', slogan: 'text-xs' },
}

/**
 * Logo DUO CAPITAL (poignée de main + nom + slogan).
 *
 * Props :
 * - orientation : 'vertical' (icône au-dessus) ou 'horizontal' (icône à gauche)
 * - size : 'md', 'lg' ou 'sidebar' (barre latérale du Dashboard)
 * - showSlogan : affiche « Ensemble, plus loin ! » sous le nom
 */
function Logo({ orientation = 'vertical', size = 'lg', showSlogan = true }) {
  const styles = SIZE_STYLES[size]
  const isVertical = orientation === 'vertical'

  return (
    <div
      className={`flex items-center ${isVertical ? 'flex-col text-center' : 'flex-row gap-3 text-left'}`}
    >
      <HandshakeIcon className={`${styles.icon} shrink-0`} />

      <div className={`flex flex-col ${isVertical ? 'items-center' : 'items-start'}`}>
        <span className={`${styles.wordmark} font-extrabold uppercase leading-none tracking-tight`}>
          <span className="text-white">Duo </span>
          <span className="text-brand-400">Capital</span>
        </span>

        {showSlogan && (
          <>
            <span className={`${styles.slogan} mt-2 font-medium italic text-white`}>
              Ensemble, plus loin !
            </span>
            <svg
              viewBox="0 0 120 8"
              className="mt-1 h-2 w-28"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M2 6 Q60 -2 118 3"
                fill="none"
                stroke="#e5242b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </>
        )}
      </div>
    </div>
  )
}

export default Logo
