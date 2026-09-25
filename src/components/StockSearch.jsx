import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, Loader2 } from 'lucide-react'
import { searchStockSymbols } from '../lib/api.js'
import { cn } from '../lib/utils.js'

export default function StockSearch({ watchlist, onAdd, onRemove }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const items = await searchStockSymbols(q)
    setResults(items)
    setSearching(false)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 350)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isInWatchlist = (symbol) => watchlist.some(s => s.yahooSymbol === symbol)

  const handleAdd = (item) => {
    const stock = {
      id: `WL-${item.symbol}`,
      symbol: item.symbol.replace('.TW', ''),
      yahooSymbol: item.symbol,
      label: item.shortName,
      market: item.market,
    }
    onAdd(stock)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowResults(true)}
          placeholder="Search stocks by symbol or name..."
          className="w-full pl-10 pr-10 py-3 rounded-full bg-card shadow-[var(--shadow)] border border-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {showResults && query.trim() && (
        <div className="absolute top-full mt-2 w-full popover z-50 max-h-80 overflow-y-auto scrollbar-thin">
          {results.length === 0 && !searching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No results found. Try typing a stock symbol directly (e.g. MU, AAPL, 2330).
            </div>
          ) : searching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : (
            results.map((item) => {
              const inList = isInWatchlist(item.symbol)
              return (
                <div
                  key={item.symbol}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/60 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {item.exchange || item.market}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.shortName}</p>
                  </div>
                  <button
                    onClick={() => inList ? onRemove(item.symbol) : handleAdd(item)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors flex-shrink-0 ml-2',
                      inList
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-primary hover:bg-primary/10'
                    )}
                    title={inList ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {inList ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
