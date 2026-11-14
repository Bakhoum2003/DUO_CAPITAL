import fistsImage from '../../../assets/fists-duo-capital.png'

/**
 * FistBumpIllustration - image officielle des deux poings qui se rejoignent
 * (page de connexion, sous « Bienvenue de nouveau ! »).
 * L'image est affichée sans déformation : la hauteur suit la largeur.
 * Prop : className (classes Tailwind de taille).
 */
function FistBumpIllustration({ className = '' }) {
  return (
    <img
      src={fistsImage}
      alt=""
      aria-hidden="true"
      width={513}
      height={196}
      className={`${className} h-auto`}
    />
  )
}

export default FistBumpIllustration
