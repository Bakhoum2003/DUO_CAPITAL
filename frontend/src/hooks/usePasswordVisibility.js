import { useState } from 'react'

/**
 * Gère l'affichage / le masquage d'un champ mot de passe.
 * Retourne l'état, la fonction de bascule et le type d'input à utiliser.
 */
export default function usePasswordVisibility() {
  const [isVisible, setIsVisible] = useState(false)

  const toggleVisibility = () => setIsVisible((current) => !current)

  return {
    isVisible,
    toggleVisibility,
    inputType: isVisible ? 'text' : 'password',
  }
}
