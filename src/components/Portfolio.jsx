import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Plus, X, Trash2, Loader2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { searchStockSymbols, fetchStockPrice } from '../lib/api.js'
import { getPortfolioInsight } from '../lib/ai.js'
import { cn } from '../lib/utils.js'

export default function Portfolio({ holdings, onAdd, onRemove, onUpdate, onAskAI, apiKey, onOpenSettings }) {
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [prices, setPrices] = useState({})
  const [loadingPrices, setLoadingPrices] = useState(false)
  const debounceRef = null

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const items = await searchStockSymbols(q)
    setResults(items)
    setSearching(false)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef) clearTimeout(debounceRef)
    setTimeout(() => doSearch(val), 350)
  }

  const handleSelectStock = (item) => {
    setSelectedStock(item)
    setQuery(`${item.symbol} — ${item.shortName}`)
    setResults([])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedStock || !quantity || !buyPrice) return
    const holding = {
      id: `PF-${selectedStock.symbol}-${Date.now()}`,
      symbol: selectedStock.symbol,
      yahooSymbol: selectedStock.symbol,
      label: selectedStock.shortName,
      market: selectedStock.market,
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
    }
    onAdd(holding)
    setSelectedStock(null)
    setQuery('')
    setQuantity('')
    setBuyPrice('')
    setShowForm(false)
  }

  // Fetch live prices for all holdings
  useEffect(() => {
    if (holdings.length === 0) return
    let cancelled = false
    setLoadingPrices(true)

    const fetchAllPrices = async () => {
      const newPrices = {}
      for (const h of holdings) {
        try {
          const data = await fetchStockPrice(h.yahooSymbol || h.symbol)
          if (data && data.currentPrice != null) {
            newPrices[h.id] = data.currentPrice
          }
        } catch {
          // skip failed fetches
        }
      }
      if (!cancelled) {
        setPrices(newPrices)
        setLoadingPrices(false)
      }
    }

    fetchAllPrices()
    const interval = setInterval(fetchAllPrices, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [holdings])

  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.buyPrice, 0)
  const totalValue = holdings.reduce((sum, h) => {
    const current = prices[h.id]
    return sum + (current != null ? current * h.quantity : 0)
  }, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {holdings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              {totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              <p className="text-xs text-muted-foreground">Current Value</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {loadingPrices && holdings.length > 0 ? '...' : totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-muted-foreground">Total P&L</p>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
              {loadingPrices ? '...' : `${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <p className={cn('text-xs font-medium', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
              {loadingPrices ? '' : `${totalPnl >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%`}
            </p>
          </div>
        </div>
      )}

      {/* Add Holding Button / Form */}
      <div className="rounded-xl border border-border bg-card p-5">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Holding
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search Stock</label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={handleChange}
                  placeholder="Search by symbol or name (e.g. AAPL, 2330, MU)..."
                  className="w-full px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {results.length > 0 && (
                  <div className="absolute top-full mt-2 w-full rounded-lg border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto">
                    {results.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleSelectStock(item)}
                        className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-0 text-left"
                      >
                        <div>
                          <span className="text-sm font-semibold">{item.symbol}</span>
                          <span className="text-xs text-muted-foreground ml-2">{item.shortName}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.exchange || item.market}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quantity (shares)</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Buy Price (per share)</label>
                <input
                  type="number"
                  step="any"
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                  placeholder="150.00"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
              >
                Add to Portfolio
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setSelectedStock(null); setQuery(''); setQuantity(''); setBuyPrice('') }}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Wallet className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Your portfolio is empty. Click "Add Holding" to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Symbol</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Buy Price</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Current</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost Basis</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Market Value</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">P&L</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const current = prices[h.id]
                const cost = h.quantity * h.buyPrice
                const value = current != null ? current * h.quantity : null
                const pnl = value != null ? value - cost : null
                const pnlPercent = pnl != null && cost > 0 ? (pnl / cost) * 100 : null

                return (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{h.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-32">{h.label}</div>
                    </td>
                    <td className="text-right px-4 py-3 tabular-nums">{h.quantity}</td>
                    <td className="text-right px-4 py-3 tabular-nums">{h.buyPrice.toFixed(2)}</td>
                    <td className="text-right px-4 py-3 tabular-nums">
                      {current != null ? current.toFixed(2) : '—'}
                    </td>
                    <td className="text-right px-4 py-3 tabular-nums">{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-right px-4 py-3 tabular-nums">
                      {value != null ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className={cn('text-right px-4 py-3 tabular-nums font-medium', pnl == null ? '' : pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {pnlPercent != null && (
                        <div className="text-xs">{pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%</div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => onRemove(h.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove holding"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Strategy Discussion */}
      {holdings.length > 0 && (
        <PortfolioAI
          holdings={holdings}
          prices={prices}
          totalCost={totalCost}
          totalValue={totalValue}
          totalPnl={totalPnl}
          apiKey={apiKey}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  )
}

function PortfolioAI({ holdings, prices, totalCost, totalValue, totalPnl, apiKey, onOpenSettings }) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [question, setQuestion] = useState('')

  const handleAsk = async () => {
    if (!apiKey) {
      setError('Please set your OpenRouter API key in Settings first.')
      return
    }
    setLoading(true)
    setError(null)

    const portfolioData = holdings.map(h => {
      const current = prices[h.id]
      const cost = h.quantity * h.buyPrice
      const value = current != null ? current * h.quantity : null
      const pnl = value != null ? value - cost : null
      const pnlPercent = pnl != null && cost > 0 ? (pnl / cost) * 100 : null
      return {
        symbol: h.symbol,
        name: h.label,
        quantity: h.quantity,
        buyPrice: h.buyPrice,
        currentPrice: current,
        costBasis: cost,
        marketValue: value,
        pnl: pnl,
        pnlPercent: pnlPercent,
      }
    })

    const prompt = `You are a professional portfolio advisor. Analyze the following portfolio and provide strategic advice.

Portfolio Summary:
- Total Cost Basis: ${totalCost.toFixed(2)}
- Current Market Value: ${totalValue.toFixed(2)}
- Total P&L: ${totalPnl.toFixed(2)} (${totalCost > 0 ? (totalPnl / totalCost * 100).toFixed(2) : 0}%)

Holdings:
${JSON.stringify(portfolioData, null, 2)}

${question ? `User question: ${question}` : 'Please provide a general portfolio review.'}

Please provide:
1. **Portfolio Overview**: Brief assessment of the overall portfolio health and diversification.
2. **Holding Analysis**: For each holding, comment on its performance and whether to hold, reduce, or add.
3. **Risk Assessment**: Key risks in the current portfolio and concentration issues.
4. **Strategic Recommendations**: Specific actionable next steps (e.g. rebalancing, new positions to consider, exit signals).
5. **Market Timing**: Any timing considerations given current market conditions.

Keep it practical and easy to understand. Use plain language.`

    try {
      const text = await getPortfolioInsight(apiKey, portfolioData, totalCost, totalValue, totalPnl, question)
      setInsight(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/15">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold">AI Portfolio Strategy</h3>
          <p className="text-xs text-muted-foreground">Discuss your portfolio with OpenRouter AI</p>
        </div>
      </div>

      {!apiKey && !insight && !error && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">No API key set</p>
          <button onClick={onOpenSettings} className="text-sm text-primary hover:underline">
            Click here to set your OpenRouter API key →
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask about your portfolio strategy (optional)..."
          className="flex-1 px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          onKeyDown={e => { if (e.key === 'Enter' && !loading) handleAsk() }}
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            'bg-primary/15 text-primary hover:bg-primary/25',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? 'Analyzing...' : 'Ask AI'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm mb-3">
          <span>{error}</span>
        </div>
      )}

      {loading && !insight && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      )}

      {insight && (
        <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-foreground/90 prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{insight}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
