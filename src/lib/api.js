import { marketOf } from '../config.js'

// --- Shared fetch utilities (Yahoo Finance via CORS proxies) ---

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
// Order matters: the same-origin Worker proxy (worker/proxy.js) is the most
// reliable (server-side fetch, no browser CORS, not blocked like the public
// proxies). The public proxies remain as fallback for plain `vite` dev, where
// the Worker is not running and /api/proxy will 404.
const CORS_PROXIES = [
  (url) => `/api/proxy?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

async function fetchWithProxyFallback(url) {
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      const proxiedUrl = CORS_PROXIES[i](url)
      const res = await fetch(proxiedUrl)
      if (res.ok) return await res.json()
    } catch (err) {
      console.warn(`Proxy ${i} failed:`, err.message)
    }
  }
  throw new Error('All fetch attempts failed (CORS or network)')
}

// --- Currency data (Yahoo Finance real-time + fallback) ---

const ER_API_BASE = 'https://open.er-api.com/v6'

function toYahooFxSymbol(base, target) {
  return `${base}${target}=X`
}

export async function fetchRate(base, target) {
  // Try Yahoo Finance first for real-time intraday rates
  try {
    const symbol = toYahooFxSymbol(base, target)
    const url = `${YAHOO_BASE}/${symbol}?range=1d&interval=5m`
    const data = await fetchWithProxyFallback(url)
    const result = data.chart?.result?.[0]
    if (result) {
      const rate = result.meta?.regularMarketPrice
      if (rate != null) {
        return {
          rate,
          base,
          target,
          timestamp: (result.meta?.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
          nextUpdate: null,
        }
      }
    }
  } catch (err) {
    console.warn('Yahoo FX fetch failed, falling back to er-api:', err.message)
  }

  // Fallback to open.er-api.com (daily updates)
  const url = `${ER_API_BASE}/latest/${base}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${base} rates: ${res.status}`)
  const data = await res.json()
  if (data.result !== 'success') throw new Error(`API error: ${data['error-type'] || 'unknown'}`)
  const rate = data.rates?.[target]
  if (!rate) throw new Error(`No rate for ${base}/${target}`)
  return {
    rate,
    base,
    target,
    timestamp: data.time_last_update_unix * 1000,
    nextUpdate: data.time_next_update_unix * 1000,
  }
}

export async function fetchIntradayRates(base, target) {
  try {
    const symbol = toYahooFxSymbol(base, target)
    const url = `${YAHOO_BASE}/${symbol}?range=1d&interval=5m`
    const data = await fetchWithProxyFallback(url)
    const result = data.chart?.result?.[0]
    if (!result) return []
    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        const d = new Date(timestamps[i] * 1000)
        history.push({
          date: d.toTimeString().slice(0, 5),
          rate: parseFloat(closes[i].toFixed(4)),
          timestamp: d.getTime(),
        })
      }
    }
    return history
  } catch (err) {
    console.warn('Intraday FX fetch failed:', err.message)
    return []
  }
}

export async function fetchHistoricalRates(base, target, days = 90) {
  // Yahoo daily closes first: frankfurter.app now redirects to an API that no
  // longer serves MYR, which left every FX chart on synthetic data.
  try {
    const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y'
    const data = await fetchWithProxyFallback(`${YAHOO_BASE}/${toYahooFxSymbol(base, target)}?range=${range}&interval=1d`)
    const result = data.chart?.result?.[0]
    const timestamps = result?.timestamp || []
    const closes = result?.indicators?.quote?.[0]?.close || []
    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue
      const d = new Date(timestamps[i] * 1000)
      history.push({ date: d.toISOString().slice(0, 10), rate: parseFloat(closes[i].toFixed(4)), timestamp: d.getTime() })
    }
    if (history.length > 1) return history
  } catch (err) {
    console.warn('Yahoo FX history failed, trying Frankfurter:', err.message)
  }

  try {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)

    const url = `https://api.frankfurter.app/${startDate}..${endDate}?from=${base}&to=${target}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)
    const data = await res.json()

    if (!data.rates) return []

    const history = []
    for (const [date, rates] of Object.entries(data.rates)) {
      if (rates[target] != null) {
        history.push({
          date,
          rate: rates[target],
          timestamp: new Date(date).getTime(),
        })
      }
    }
    history.sort((a, b) => a.timestamp - b.timestamp)
    return history
  } catch (err) {
    console.warn('Frankfurter historical fetch failed, generating synthetic history:', err.message)
    return generateSyntheticHistory(base, target, days)
  }
}

function generateSyntheticHistory(base, target, days) {
  const baseRates = { 'MYR-TWD': 6.8, 'MYR-USD': 0.21 }
  const key = `${base}-${target}`
  const startRate = baseRates[key] || 1
  const history = []
  const today = new Date()

  for (let i = days; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.15)) * 0.02
    const trend = (days - i) * 0.0003
    const rate = startRate * (1 + noise + trend)
    history.push({
      date: d.toISOString().slice(0, 10),
      rate: parseFloat(rate.toFixed(4)),
      timestamp: d.getTime(),
    })
  }
  return history
}

// --- Stock data (Yahoo Finance) ---

export async function fetchStockPrice(yahooSymbol) {
  const url = `${YAHOO_BASE}/${yahooSymbol}?range=1d&interval=5m`
  const data = await fetchWithProxyFallback(url)
  const result = data.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${yahooSymbol}`)
  const price = result.meta?.regularMarketPrice
  if (price == null) throw new Error(`No price for ${yahooSymbol}`)
  return {
    price,
    previousClose: result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null,
    symbol: yahooSymbol,
    currency: result.meta?.currency || 'Unknown',
    exchangeName: result.meta?.exchangeName || 'Unknown',
    timestamp: (result.meta?.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
  }
}

export async function fetchIntradayStock(yahooSymbol) {
  try {
    const url = `${YAHOO_BASE}/${yahooSymbol}?range=1d&interval=5m`
    const data = await fetchWithProxyFallback(url)
    const result = data.chart?.result?.[0]
    if (!result) return []
    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        const d = new Date(timestamps[i] * 1000)
        history.push({
          date: d.toTimeString().slice(0, 5),
          rate: parseFloat(closes[i].toFixed(4)),
          timestamp: d.getTime(),
        })
      }
    }
    return history
  } catch (err) {
    console.warn('Intraday stock fetch failed:', err.message)
    return []
  }
}

export async function fetchStockHistory(yahooSymbol, range = '3mo') {
  const url = `${YAHOO_BASE}/${yahooSymbol}?range=${range}&interval=1d`
  try {
    const data = await fetchWithProxyFallback(url)
    const result = data.chart?.result?.[0]
    if (!result) throw new Error('No chart data')

    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []

    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        const d = new Date(timestamps[i] * 1000)
        history.push({
          date: d.toISOString().slice(0, 10),
          rate: parseFloat(closes[i].toFixed(4)),
          timestamp: d.getTime(),
        })
      }
    }
    if (history.length === 0) throw new Error('No valid historical data')
    return history
  } catch (err) {
    console.warn(`Stock history fetch failed for ${yahooSymbol}:`, err.message)
    return generateSyntheticStockHistory(yahooSymbol)
  }
}

// --- Stock search (Yahoo Finance search API) ---

export async function searchStockSymbols(query) {
  if (!query || query.trim().length < 1) return []
  const q = query.trim()

  // Try Yahoo Finance search API first
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&quotesQueryId=tss_match_phrase_query`
    const data = await fetchWithProxyFallback(url)
    const quotes = data.quotes || []
    const results = quotes
      .filter(item => item.symbol && item.quoteType && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF' || item.quoteType === 'MUTUALFUND'))
      .map(item => ({
        symbol: item.symbol,
        shortName: item.shortname || item.longname || item.symbol,
        exchange: item.exchange || item.exchDisp || '',
        quoteType: item.quoteType,
        market: item.exchange?.includes('TW') ? 'TW' : marketOf(item.symbol),
      }))
    if (results.length > 0) return results
  } catch (err) {
    console.warn('Stock search API failed, trying symbol validation:', err.message)
  }

  // Fallback: validate the query as a direct symbol via the chart API
  // Try the raw symbol, and common suffixes for international markets
  const candidates = [q, `${q}.TW`, `${q}.TWO`, `${q}.KL`, `${q}.T`, `${q}.L`, `${q}.HK`]
  const seen = new Set()
  const results = []

  for (const sym of candidates) {
    if (seen.has(sym)) continue
    seen.add(sym)
    try {
      const url = `${YAHOO_BASE}/${sym}?range=1d&interval=5m`
      const data = await fetchWithProxyFallback(url)
      const result = data.chart?.result?.[0]
      if (result && result.meta?.regularMarketPrice != null) {
        results.push({
          symbol: sym,
          shortName: result.meta?.longName || result.meta?.shortName || sym,
          exchange: result.meta?.exchangeName || '',
          quoteType: result.meta?.instrumentType || 'EQUITY',
          market: marketOf(sym),
        })
      }
    } catch {
      // Symbol not valid, skip
    }
  }

  return results
}

// --- Currency pair search ---

const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'KRW', name: 'Korean Won' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
]

export async function searchCurrencyPairs(query) {
  if (!query || query.trim().length < 1) return []
  const q = query.trim().toUpperCase()

  // If query looks like "BASE-TARGET" or "BASE/TARGET" or "BASE TARGET", split it
  const parts = q.split(/[-/\s]+/).filter(Boolean)
  const pairs = []

  if (parts.length >= 2) {
    const base = parts[0]
    const target = parts[1]
    if (base.length === 3 && target.length === 3) {
      pairs.push({ base, target })
    }
  }

  // Also try matching single currency code to common counterparts
  const matchedCurrency = COMMON_CURRENCIES.find(c => c.code === q)
  if (matchedCurrency) {
    // Generate common pairs: USD/{code} and {code}/USD
    if (q !== 'USD') {
      pairs.push({ base: 'USD', target: q })
      pairs.push({ base: q, target: 'USD' })
    }
    // Also pair with EUR
    if (q !== 'EUR') {
      pairs.push({ base: 'EUR', target: q })
      pairs.push({ base: q, target: 'EUR' })
    }
  }

  // Try to find currencies by name partial match
  const nameMatches = COMMON_CURRENCIES.filter(c =>
    c.name.toUpperCase().includes(q) || c.code.includes(q)
  )
  for (const c of nameMatches) {
    if (c.code !== 'USD') {
      pairs.push({ base: 'USD', target: c.code })
      pairs.push({ base: c.code, target: 'USD' })
    }
  }

  // Deduplicate
  const seen = new Set()
  const uniquePairs = pairs.filter(p => {
    const key = `${p.base}/${p.target}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Validate each pair via the chart API (limit to first 6 to avoid too many requests)
  const results = []
  for (const pair of uniquePairs.slice(0, 6)) {
    try {
      const symbol = toYahooFxSymbol(pair.base, pair.target)
      const url = `${YAHOO_BASE}/${symbol}?range=1d&interval=5m`
      const data = await fetchWithProxyFallback(url)
      const result = data.chart?.result?.[0]
      if (result && result.meta?.regularMarketPrice != null) {
        const baseName = COMMON_CURRENCIES.find(c => c.code === pair.base)?.name || pair.base
        const targetName = COMMON_CURRENCIES.find(c => c.code === pair.target)?.name || pair.target
        results.push({
          base: pair.base,
          target: pair.target,
          label: `${baseName} → ${targetName}`,
          rate: result.meta.regularMarketPrice,
        })
      }
    } catch {
      // Pair not valid, skip
    }
  }

  return results
}

function generateSyntheticStockHistory(yahooSymbol) {
  const basePrices = {
    '0050.TW': 185, '006208.TW': 92, '0056.TW': 35, '00646.TW': 55,
    '00878.TW': 28, '2303.TW': 48, '2330.TW': 1080, 'SPCX': 12,
  }
  const startPrice = basePrices[yahooSymbol] || 100
  const history = []
  const today = new Date()
  const days = 90

  for (let i = days; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const noise = (Math.sin(i * 0.25) + Math.cos(i * 0.12)) * 0.015
    const trend = (days - i) * 0.0002
    const price = startPrice * (1 + noise + trend)
    history.push({
      date: d.toISOString().slice(0, 10),
      rate: parseFloat(price.toFixed(2)),
      timestamp: d.getTime(),
    })
  }
  return history
}
