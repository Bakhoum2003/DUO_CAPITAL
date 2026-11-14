/**
 * BrandWave - illustration SVG décorative (recréée d'après les maquettes).
 * Prop : className (classes Tailwind de taille/position).
 */
function BrandWave({ className = '' }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 400 90" preserveAspectRatio="none">
    <path d="M0 34 C90 66 230 6 400 22 V90 H0 z" fill="#ffffff"/>
    <path d="M0 46 C100 76 240 20 400 34 V90 H0 z" fill="#e5242b"/>
    </svg>
  )
}

export default BrandWave
