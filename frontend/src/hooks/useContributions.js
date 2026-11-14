import { useCallback, useEffect, useState } from 'react'
import { getContributions } from '../services/contributionsService'

const LOAD_ERROR_MESSAGE = 'Impossible de charger les cotisations.'

function createContributionId() {
  return `contribution-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Charge les cotisations et expose l'ajout, la modification et la suppression.
 * Pour l'instant tout est conservé en mémoire (perdu à l'actualisation de la page) :
 * ce sont ces trois fonctions qui appelleront le backend plus tard.
 *
 * Retourne { contributions, isLoading, errorMessage, addContribution, updateContribution, deleteContribution }.
 * Une cotisation (values) a la forme { associateId, amount, date, description }.
 */
export default function useContributions() {
  const [state, setState] = useState({ contributions: [], isLoading: true, errorMessage: '' })

  useEffect(() => {
    let isCancelled = false

    getContributions()
      .then((contributions) => {
        if (!isCancelled) setState({ contributions, isLoading: false, errorMessage: '' })
      })
      .catch(() => {
        if (!isCancelled) setState({ contributions: [], isLoading: false, errorMessage: LOAD_ERROR_MESSAGE })
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const addContribution = useCallback((values) => {
    setState((previous) => ({
      ...previous,
      contributions: [{ id: createContributionId(), ...values }, ...previous.contributions],
    }))
  }, [])

  const updateContribution = useCallback((contributionId, values) => {
    setState((previous) => ({
      ...previous,
      contributions: previous.contributions.map((contribution) =>
        contribution.id === contributionId ? { ...contribution, ...values } : contribution,
      ),
    }))
  }, [])

  const deleteContribution = useCallback((contributionId) => {
    setState((previous) => ({
      ...previous,
      contributions: previous.contributions.filter((contribution) => contribution.id !== contributionId),
    }))
  }, [])

  return { ...state, addContribution, updateContribution, deleteContribution }
}
