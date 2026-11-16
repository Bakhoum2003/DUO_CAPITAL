import { useCallback, useEffect, useState } from 'react'
import { getContributions } from '../services/contributionsService'

const LOAD_ERROR_MESSAGE = 'Impossible de charger les cotisations.'

function createContributionId() {
  return `contribution-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

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
