/**
 * Décor d'arrière-plan des pages d'authentification (courbes verte et rouge en haut à droite).
 * Purement décoratif : aucune prop.
 */
function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute -right-24 -top-8 h-72 w-[36rem] max-w-none"
        viewBox="0 0 560 280"
        focusable="false"
      >
        <path d="M560 0 V60 C470 110 330 70 250 0 Z" fill="#cfeedb" opacity="0.7" />
        <path d="M560 0 V40 C500 70 410 40 350 0 Z" fill="#1a9a47" opacity="0.85" />
        <path d="M560 22 V120 C470 140 380 90 310 22 C390 50 480 40 560 22 Z" fill="#e5242b" />
      </svg>
      <svg
        className="absolute -left-24 bottom-0 h-56 w-[30rem] max-w-none"
        viewBox="0 0 480 220"
        focusable="false"
      >
        <path d="M0 220 V90 C90 60 200 140 300 220 Z" fill="#dff3e6" opacity="0.8" />
      </svg>
    </div>
  )
}

export default AuthBackdrop
