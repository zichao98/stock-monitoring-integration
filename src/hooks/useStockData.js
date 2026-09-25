import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchStockPrice, fetchStockHistory, fetchIntradayStock } from '../lib/api.js'

export function useStockData(stock, pollingInterval = 30) {
  const symbol = stock?.yahooSymbol
  const [history, setHistory] = useState([])
  const [intradayHistory, setIntradayHistory] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)
  // The symbol responses belong to; late replies for a previous symbol are dropped
  const currentSymbol = useRef(symbol)

  const loadHistorical = useCallback(async () => {
    if (!symbol) return
    try {
      const hist = await fetchStockHistory(symbol, '3mo')
      if (currentSymbol.current === symbol) setHistory(hist)
    } catch (err) {
      console.warn('Stock history load failed:', err.message)
    }
  }, [symbol])

  const pollPrice = useCallback(async () => {
    if (!symbol) return
    try {
      setError(null)
      const data = await fetchStockPrice(symbol)
      if (currentSymbol.current !== symbol) return
      setCurrentPrice(data.price)
      setLastUpdated(Date.now())

      setHistory(prev => {
        // Date the quote by its last trade, not by today's date: while a market is
        // closed, a "today" entry would repeat the last close and show 0.00%.
        const today = new Date(data.timestamp || Date.now()).toISOString().slice(0, 10)
        const todayEntry = prev.find(h => h.date === today)
        if (todayEntry) {
          return prev.map(h => h.date === today ? { ...h, rate: data.price } : h)
        }
        return [...prev, { date: today, rate: data.price, timestamp: data.timestamp || Date.now() }]
      })

      const intraday = await fetchIntradayStock(symbol)
      if (intraday.length > 0 && currentSymbol.current === symbol) {
        setIntradayHistory(intraday)
      }
    } catch (err) {
      if (currentSymbol.current === symbol) setError(err.message)
    } finally {
      if (currentSymbol.current === symbol) setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    currentSymbol.current = symbol
    // Clear the previous stock's data so its chart never shows under this one
    setHistory([])
    setIntradayHistory([])
    setCurrentPrice(null)
    setError(null)
    if (!symbol) { setLoading(false); return }

    setLoading(true)
    loadHistorical().then(() => pollPrice())

    intervalRef.current = setInterval(pollPrice, pollingInterval * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [symbol, loadHistorical, pollPrice, pollingInterval])

  return { history, intradayHistory, currentPrice, loading, error, lastUpdated, refresh: pollPrice }
}
