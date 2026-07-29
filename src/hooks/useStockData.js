import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchStockPrice, fetchStockHistory, fetchIntradayStock } from '../lib/api.js'

export function useStockData(stock, pollingInterval = 30) {
  const [history, setHistory] = useState([])
  const [intradayHistory, setIntradayHistory] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const loadHistorical = useCallback(async () => {
    try {
      const hist = await fetchStockHistory(stock.yahooSymbol, '3mo')
      setHistory(hist)
    } catch (err) {
      console.warn('Stock history load failed:', err.message)
    }
  }, [stock.yahooSymbol])

  const pollPrice = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchStockPrice(stock.yahooSymbol)
      setCurrentPrice(data.price)
      setLastUpdated(Date.now())

      setHistory(prev => {
        const today = new Date().toISOString().slice(0, 10)
        const todayEntry = prev.find(h => h.date === today)
        if (todayEntry) {
          return prev.map(h => h.date === today ? { ...h, rate: data.price } : h)
        }
        return [...prev, { date: today, rate: data.price, timestamp: Date.now() }]
      })

      const intraday = await fetchIntradayStock(stock.yahooSymbol)
      if (intraday.length > 0) {
        setIntradayHistory(intraday)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [stock.yahooSymbol])

  useEffect(() => {
    setLoading(true)
    loadHistorical().then(() => pollPrice())

    intervalRef.current = setInterval(pollPrice, pollingInterval * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadHistorical, pollPrice, pollingInterval])

  return { history, intradayHistory, currentPrice, loading, error, lastUpdated, refresh: pollPrice }
}
