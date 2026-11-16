import { useCallback, useEffect, useState } from 'react'
import { getBusinesses, getOperations } from '../services/businessService'

const LOAD_ERROR_MESSAGE = 'Impossible de charger les business.'

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function useBusinesses() {
  const [state, setState] = useState({ businesses: [], operations: [], isLoading: true, errorMessage: '' })

  useEffect(() => {
    let isCancelled = false

    Promise.all([getBusinesses(), getOperations()])
      .then(([businesses, operations]) => {
        if (!isCancelled) setState({ businesses, operations, isLoading: false, errorMessage: '' })
      })
      .catch(() => {
        if (!isCancelled) {
          setState({ businesses: [], operations: [], isLoading: false, errorMessage: LOAD_ERROR_MESSAGE })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const addBusiness = useCallback((values) => {
    const id = createId('business')
    setState((previous) => ({ ...previous, businesses: [{ id, ...values }, ...previous.businesses] }))
    return id
  }, [])

  const updateBusiness = useCallback((businessId, values) => {
    setState((previous) => ({
      ...previous,
      businesses: previous.businesses.map((business) =>
        business.id === businessId ? { ...business, ...values } : business,
      ),
    }))
  }, [])

  const deleteBusiness = useCallback((businessId) => {
    setState((previous) => ({
      ...previous,
      businesses: previous.businesses.filter((business) => business.id !== businessId),
      operations: previous.operations.filter((operation) => operation.businessId !== businessId),
    }))
  }, [])

  const addOperation = useCallback((businessId, values) => {
    setState((previous) => ({
      ...previous,
      operations: [{ id: createId('operation'), businessId, ...values }, ...previous.operations],
    }))
  }, [])

  const updateOperation = useCallback((operationId, values) => {
    setState((previous) => ({
      ...previous,
      operations: previous.operations.map((operation) =>
        operation.id === operationId ? { ...operation, ...values } : operation,
      ),
    }))
  }, [])

  const deleteOperation = useCallback((operationId) => {
    setState((previous) => ({
      ...previous,
      operations: previous.operations.filter((operation) => operation.id !== operationId),
    }))
  }, [])

  return { ...state, addBusiness, updateBusiness, deleteBusiness, addOperation, updateOperation, deleteOperation }
}
