import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, Loader2 } from 'lucide-react'
import { searchCurrencyPairs } from '../lib/api.js'
import { cn } from '../lib/utils.js'

export default function CurrencySearch({ pairs, onAdd, onRemove }) {
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
    const items = await searchCurrencyPairs(q)
    setResults(items)
    setSearching(false)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 400)
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

  const isInList = (base, target) => pairs.some(p => p.base === base && p.target === target)

  const handleAdd = (item) => {
    const pair = {
      id: `${item.base}-${item.target}`,
      base: item.base,
      target: item.target,
      label: item.label,
    }
    onAdd(pair)
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
          placeholder="Search currency pairs (e.g. USD-TWD, EUR, Japanese Yen)..."
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
              No pairs found. Try typing a currency code (e.g. USD, EUR, TWD) or a pair like USD-TWD.
            </div>
          ) : searching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : (
            results.map((item) => {
              const inList = isInList(item.base, item.target)
              return (
                <div
                  key={`${item.base}/${item.target}`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/60 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.base}/{item.target}</span>
                      {item.rate != null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium tabular-nums">
                          {item.rate.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                  </div>
                  <button
                    onClick={() => inList ? onRemove(`${item.base}-${item.target}`) : handleAdd(item)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors flex-shrink-0 ml-2',
                      inList
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-primary hover:bg-primary/10'
                    )}
                    title={inList ? 'Remove pair' : 'Add pair'}
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
