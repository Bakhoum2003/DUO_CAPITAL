import { useEffect, useState } from 'react'

const FEEDBACK_DURATION_MS = 4000

export default function useFeedbackMessage() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!message) return undefined
    const timerId = setTimeout(() => setMessage(''), FEEDBACK_DURATION_MS)
    return () => clearTimeout(timerId)
  }, [message])

  return [message, setMessage]
}
