import { useEffect, useRef } from 'react'
import { createFormBinding } from '../pwa/unsavedChangesStore'
import { unsavedChangesStore } from '../pwa/defaultUnsavedChangesStore'

/**
 * Signale au suivi central (mise à jour PWA, fermeture de page) que ce formulaire contient des modifications non enregistrées.
 * - À appeler dans le composant qui porte l'état du formulaire, avec « modifié ? » (vrai/faux) ;
 * - le formulaire s'inscrit à l'affichage et se désinscrit au démontage : fermer la fenêtre (enregistrement réussi, Annuler) le libère.
 *
 * @param {boolean} isDirty le formulaire contient des modifications non enregistrées
 * @param {ReturnType<import('../pwa/unsavedChangesStore').createUnsavedChangesStore>} [store] remplaçable dans les tests
 */
export default function useUnsavedChanges(isDirty, store = unsavedChangesStore) {
  const bindingRef = useRef(null)
  if (!bindingRef.current || bindingRef.current.store !== store) bindingRef.current = { store, binding: createFormBinding(store) }
  const { binding } = bindingRef.current

  useEffect(() => {
    binding.attach()
    return () => binding.release()
  }, [binding])

  useEffect(() => {
    binding.sync(isDirty)
  }, [binding, isDirty])
}
