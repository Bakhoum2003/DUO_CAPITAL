import { useEffect, useState } from 'react'
import { getDashboardData } from '../services/dashboardService'

const LOAD_ERROR_MESSAGE = 'Impossible de charger les données du tableau de bord.'

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
