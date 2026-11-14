import { useCallback, useState } from 'react'
import { DEFAULT_PERIOD } from '../constants/statisticsSettings'

/**
 * Gère la période des statistiques (« Ce mois », « 6 derniers mois », période personnalisée…).
 * Retourne { periodKey, customStartDate, customEndDate, setPeriodKey, setCustomStartDate,
 *   setCustomEndDate, resetPeriod, isDefaultPeriod }.
 */
export default function useStatisticsPeriod() {
  const [periodKey, setPeriodKey] = useState(DEFAULT_PERIOD)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const resetPeriod = useCallback(() => {
    setPeriodKey(DEFAULT_PERIOD)
    setCustomStartDate('')
    setCustomEndDate('')
  }, [])

  const isDefaultPeriod = periodKey === DEFAULT_PERIOD

  return { periodKey, customStartDate, customEndDate, setPeriodKey, setCustomStartDate, setCustomEndDate, resetPeriod, isDefaultPeriod }
}
