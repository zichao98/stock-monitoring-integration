import { useCallback, useEffect, useState } from 'react'

const CACHE_KEY = 'lengs-holdings-v1'
const REFRESH_MS = 5 * 60 * 1000

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch { return null }
}

/** Holdings mirrored from Lengs Funding via the Worker's /api/holdings. The last good copy is cached so the page still renders offline. */
export function useLengsHoldings() {
  const [state, setState] = useState(() => {
    const cached = readCache()
    return { holdings: cached?.holdings || [], updatedAt: cached?.updatedAt || null, syncedAt: cached?.syncedAt || null, loading: true, error: null }
  })

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    try {
      const res = await fetch('/api/holdings', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const next = { holdings: data.holdings || [], updatedAt: data.updatedAt, syncedAt: new Date().toISOString() }
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
      setState({ ...next, loading: false, error: null })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }))
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  return { ...state, refresh }
}

/** MYR-based FX rates for totalling holdings across currencies. */
export function useMyrRates() {
  const [rates, setRates] = useState(null)
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/MYR')
      .then(r => r.json())
      .then(d => { if (d.result === 'success') setRates(d.rates) })
      .catch(() => {})
  }, [])
  const toMyr = useCallback((value, currency) => {
    if (value == null) return null
    if (currency === 'MYR') return value
    const rate = rates?.[currency]
    return rate ? value / rate : null
  }, [rates])
  return { rates, toMyr }
}
