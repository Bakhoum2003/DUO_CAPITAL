import { useOutletContext } from 'react-router-dom'

/**
 * Accès aux business et à leurs opérations depuis les pages du module Business.
 * Les données sont chargées une seule fois par BusinessModuleLayout, ce qui permet à la liste
 * et à la page de détails de partager les mêmes données (un ajout est visible partout).
 *
 * Retourne { businesses, operations, errorMessage, addBusiness, updateBusiness, deleteBusiness,
 *   addOperation, updateOperation, deleteOperation } (voir useBusinesses).
 */
export default function useBusinessStore() {
  return useOutletContext()
}
