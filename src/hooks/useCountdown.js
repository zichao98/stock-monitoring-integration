import { useState, useEffect, useRef } from 'react'

export function useCountdown(lastUpdated, pollingInterval) {
  const [secondsLeft, setSecondsLeft] = useState(pollingInterval)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!lastUpdated) {
      setSecondsLeft(pollingInterval)
      return
    }

    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - lastUpdated) / 1000)
      const remaining = Math.max(0, pollingInterval - elapsed)
      setSecondsLeft(remaining)
    }

    updateCountdown()
    intervalRef.current = setInterval(updateCountdown, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [lastUpdated, pollingInterval])

  return secondsLeft
}
