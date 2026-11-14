import { useEffect, useState } from 'react'

const FEEDBACK_DURATION_MS = 4000

/**
 * Message de confirmation temporaire (ex. « Business ajouté avec succès. »), effacé après quelques secondes.
 * Retourne [message, showMessage] : showMessage('texte') affiche le message.
 */
export default function useFeedbackMessage() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!message) return undefined
    const timerId = setTimeout(() => setMessage(''), FEEDBACK_DURATION_MS)
    return () => clearTimeout(timerId)
  }, [message])

  return [message, setMessage]
}
