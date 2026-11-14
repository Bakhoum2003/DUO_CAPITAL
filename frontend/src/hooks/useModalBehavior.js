import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Comportement d'accessibilité d'une fenêtre modale, à appeler dans le composant de la fenêtre
 * (qui n'est monté que lorsqu'elle est ouverte) :
 * - Échap ferme la fenêtre ;
 * - le défilement de la page derrière est bloqué ;
 * - le focus entre dans la fenêtre, y reste avec Tab / Maj+Tab, puis revient à l'élément précédent.
 *
 * @param dialogRef référence vers l'élément role="dialog"
 * @param onClose fonction appelée pour fermer la fenêtre
 */
export default function useModalBehavior({ dialogRef, onClose }) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const getFocusableElements = () => Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
    const firstField = dialog.querySelector('input, textarea, select')
    ;(firstField ?? getFocusableElements()[0])?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [dialogRef])
}
