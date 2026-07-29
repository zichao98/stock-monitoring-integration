import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchRate, fetchHistoricalRates, fetchIntradayRates } from '../lib/api.js'

export function useRateData(pair, pollingInterval = 30) {
  const [history, setHistory] = useState([])
  const [intradayHistory, setIntradayHistory] = useState([])
  const [currentRate, setCurrentRate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const loadHistorical = useCallback(async () => {
    try {
      const hist = await fetchHistoricalRates(pair.base, pair.target, 90)
      setHistory(hist)
    } catch (err) {
      console.warn('Historical load failed:', err.message)
    }
  }, [pair.base, pair.target])

  const pollRate = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchRate(pair.base, pair.target)
      setCurrentRate(data.rate)
      setLastUpdated(Date.now())

      setHistory(prev => {
        const today = new Date().toISOString().slice(0, 10)
        const todayEntry = prev.find(h => h.date === today)
        if (todayEntry) {
          return prev.map(h => h.date === today ? { ...h, rate: data.rate } : h)
        }
        return [...prev, { date: today, rate: data.rate, timestamp: Date.now() }]
      })

      const intraday = await fetchIntradayRates(pair.base, pair.target)
      if (intraday.length > 0) {
        setIntradayHistory(intraday)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [pair.base, pair.target])

  useEffect(() => {
    setLoading(true)
    loadHistorical().then(() => pollRate())

    intervalRef.current = setInterval(pollRate, pollingInterval * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadHistorical, pollRate, pollingInterval])

  return { history, intradayHistory, currentRate, loading, error, lastUpdated, refresh: pollRate }
}
