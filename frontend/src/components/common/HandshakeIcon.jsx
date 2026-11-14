import logoImage from '../../assets/logo-duo-capital.png'

/**
 * HandshakeIcon - image officielle du logo DUO CAPITAL (poignée de main rouge et verte).
 * L'image est affichée sans déformation (object-contain) dans la taille donnée.
 * Prop : className (classes Tailwind de taille).
 */
function HandshakeIcon({ className = '' }) {
  return (
    <img
      src={logoImage}
      alt=""
      aria-hidden="true"
      width={499}
      height={323}
      className={`${className} object-contain`}
    />
  )
}

export default HandshakeIcon
