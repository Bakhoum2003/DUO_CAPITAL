import { useEffect, useState } from 'react'
import { getDashboardData } from '../services/dashboardService'

const LOAD_ERROR_MESSAGE = 'Impossible de charger les données du tableau de bord.'

/**
 * Charge les données du Dashboard.
 * Retourne { data, isLoading, errorMessage } : les composants n'ont ainsi jamais
 * à savoir d'où viennent les données (fichier local aujourd'hui, backend demain).
 */
export default function useDashboardData() {
  const [state, setState] = useState({ data: null, isLoading: true, errorMessage: '' })

  useEffect(() => {
    let isCancelled = false

    getDashboardData()
      .then((data) => {
        if (!isCancelled) setState({ data, isLoading: false, errorMessage: '' })
      })
      .catch(() => {
        if (!isCancelled) setState({ data: null, isLoading: false, errorMessage: LOAD_ERROR_MESSAGE })
      })

    return () => {
      isCancelled = true
    }
  }, [])

  return state
}
