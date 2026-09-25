import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Loader2, RefreshCw, ExternalLink, AlertTriangle, Wallet } from 'lucide-react'
import { fetchStockPrice } from '../lib/api.js'
import { getPortfolioInsight } from '../lib/ai.js'
import { cn } from '../lib/utils.js'
import { useLengsHoldings, useMyrRates } from '../hooks/useLengsHoldings.js'
import { AnimatedNumber, Delta } from './ui.jsx'

const LENGS_URL = 'https://lengs-funding.zichaoleng55.workers.dev/#portfolio'
const MARKETS = [
  { id: 'TW', label: 'Taiwan', currency: 'TWD', color: 'rgb(var(--blue))' },
  { id: 'MY', label: 'Malaysia', currency: 'MYR', color: 'rgb(var(--yellow))' },
  { id: 'US', label: 'United States', currency: 'USD', color: 'rgb(var(--purple))' },
]
const fmt = (n, digits = 2) => n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const signed = (n, digits = 2) => n == null ? '—' : `${n >= 0 ? '+' : ''}${fmt(n, digits)}`
const decimalsFor = (currency) => currency === 'TWD' ? 0 : 2

/** Holdings mirrored from Lengs Funding: read-only here, edited there. Totals are converted to MYR. */
export default function Portfolio({ apiKey, onOpenSettings }) {
  const { holdings: synced, updatedAt, syncedAt, loading: syncing, error: syncError, refresh } = useLengsHoldings()
  const { toMyr } = useMyrRates()
  const [quotes, setQuotes] = useState({})
  const [loadingPrices, setLoadingPrices] = useState(false)
  const symbolsKey = synced.map(h => h.symbol).join(',')

  // Live prices for every holding, refreshed every 30s
  useEffect(() => {
    if (!synced.length) return
    let cancelled = false
    // Apply each quote as it lands so one slow or unknown symbol does not hold up the rest
    const load = async () => {
      setLoadingPrices(true)
      await Promise.allSettled(synced.map(h => fetchStockPrice(h.symbol).then(q => {
        if (!cancelled) setQuotes(prev => ({ ...prev, [h.symbol]: q }))
      })))
      if (!cancelled) setLoadingPrices(false)
    }
    load()
    const id = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [symbolsKey])

  const rows = useMemo(() => synced.map(h => {
    const q = quotes[h.symbol]
    const price = q?.price ?? null
    const value = price != null ? price * h.quantity : null
    const pnl = value != null ? value - h.cost : null
    const dayChange = q?.previousClose ? (price / q.previousClose - 1) * 100 : null
    return {
      ...h, price, value, pnl, dayChange,
      avgCost: h.quantity ? h.cost / h.quantity : 0,
      pnlPct: pnl != null && h.cost > 0 ? (pnl / h.cost) * 100 : null,
      // Without a quote, count the holding at cost so totals are not understated
      valueMyr: toMyr(value ?? h.cost, h.currency),
      costMyr: toMyr(h.cost, h.currency),
    }
  }), [synced, quotes, toMyr])

  const total = rows.reduce((t, r) => ({ value: t.value + (r.valueMyr || 0), cost: t.cost + (r.costMyr || 0) }), { value: 0, cost: 0 })
  const totalPnl = total.value - total.cost
  const totalPnlPct = total.cost ? (totalPnl / total.cost) * 100 : null
  const byMarket = MARKETS.map(m => {
    const list = rows.filter(r => r.market === m.id).sort((a, b) => (b.valueMyr || 0) - (a.valueMyr || 0))
    const value = list.reduce((s, r) => s + (r.value ?? r.cost), 0)
    const cost = list.reduce((s, r) => s + r.cost, 0)
    const valueMyr = list.reduce((s, r) => s + (r.valueMyr || 0), 0)
    return { ...m, list, value, cost, pnl: value - cost, valueMyr, weight: total.value ? valueMyr / total.value * 100 : 0 }
  }).filter(m => m.list.length)
  const fxReady = rows.length === 0 || rows.every(r => r.costMyr != null)

  // Shape expected by PortfolioAI
  const aiHoldings = rows.map(r => ({ id: r.symbol, symbol: `${r.code} (${r.currency})`, label: r.name, quantity: r.quantity, buyPrice: r.avgCost }))
  const aiPrices = Object.fromEntries(rows.map(r => [r.symbol, r.price]))

  return (
    <div className="space-y-5">
      {/* Sync status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className={cn('w-2 h-2 rounded-full', syncError ? 'bg-red-500' : syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500')} />
          <span>
            Synced from <strong className="text-foreground font-semibold">Lengs Funding</strong>
            {updatedAt ? ` · book updated ${new Date(updatedAt).toLocaleString()}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a href={LENGS_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-input text-xs font-semibold transition-colors">
            Edit in Lengs Funding <ExternalLink className="w-3 h-3" />
          </a>
          <button onClick={refresh} className="round-button !w-8 !h-8" title="Sync now" aria-label="Sync now">
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {syncError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
          <AlertTriangle className="w-4 h-4 flex-none" />
          <span>Could not sync from Lengs Funding ({syncError}).{synced.length ? ` Showing the copy from ${new Date(syncedAt).toLocaleString()}.` : ''}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center py-16 text-muted-foreground">
          {syncing ? <Loader2 className="w-6 h-6 animate-spin mb-3" /> : null}
          <p className="text-sm">{syncing ? 'Loading holdings from Lengs Funding…' : 'No holdings in Lengs Funding yet.'}</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Market value" note={`${rows.length} holdings · in MYR`}>
              {fxReady ? <>RM <AnimatedNumber value={total.value} decimals={2} /></> : '…'}
            </Metric>
            <Metric label="Cost basis" note="in MYR at today's FX">
              {fxReady ? <>RM <span className="num">{fmt(total.cost)}</span></> : '…'}
            </Metric>
            <Metric label="Unrealised P&L" note={loadingPrices && !Object.keys(quotes).length ? 'Fetching prices…' : 'price vs. average cost'}
              tone={totalPnl >= 0 ? 'text-green-500' : 'text-red-500'} extra={fxReady && <Delta value={totalPnlPct} />}>
              {fxReady ? <span className="num">{signed(totalPnl)}</span> : '…'}
            </Metric>
          </div>

          {/* Allocation */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">ALLOCATION BY MARKET</p>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {byMarket.map(m => (
                <i key={m.id} className="h-full transition-[width] duration-700" style={{ width: `${m.weight}%`, background: m.color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
              {byMarket.map(m => (
                <span key={m.id} className="flex items-center gap-2">
                  <i className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-muted-foreground">{m.label}</span>
                  <strong className="num">{m.weight.toFixed(1)}%</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Holdings by market */}
          {byMarket.map((m, mi) => (
            <div key={m.id} className="arrive panel overflow-hidden" style={{ '--i': mi + 2 }}>
              <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-3">
                <div>
                  <p className="eyebrow">{m.label.toUpperCase()} · {m.currency}</p>
                  <h3 className="text-lg font-semibold tracking-tight">{m.list.length} holdings</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold num">{m.currency} {fmt(m.value, decimalsFor(m.currency))}</p>
                  <p className={cn('text-xs font-semibold num', m.pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {signed(m.pnl, decimalsFor(m.currency))} ({m.cost ? signed(m.pnl / m.cost * 100) : '—'}%)
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-y border-border/60">
                      <th className="text-left font-medium px-5 py-2.5">Holding</th>
                      <th className="text-right font-medium px-3 py-2.5">Shares</th>
                      <th className="text-right font-medium px-3 py-2.5">Avg cost / Price</th>
                      <th className="text-right font-medium px-3 py-2.5">Value</th>
                      <th className="text-right font-medium px-3 py-2.5">P&L</th>
                      <th className="text-left font-medium px-5 py-2.5 w-36">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.list.map(r => {
                      const weight = total.value ? (r.valueMyr || 0) / total.value * 100 : 0
                      return (
                        <tr key={r.symbol} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold num">{r.code}</span>
                              <span className="truncate max-w-[180px]">{r.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground num">{r.symbol}</div>
                          </td>
                          <td className="text-right px-3 py-3 num">{fmt(r.quantity, Number.isInteger(r.quantity) ? 0 : 3)}</td>
                          <td className="text-right px-3 py-3 num">
                            <div className="text-muted-foreground">{fmt(r.avgCost)}</div>
                            <div className="font-semibold">{r.price != null ? <AnimatedNumber value={r.price} decimals={2} /> : <span className="text-muted-foreground font-normal" title="No live quote for this symbol">no quote</span>}</div>
                          </td>
                          <td className="text-right px-3 py-3 num">
                            {fmt(r.value, decimalsFor(r.currency))}
                            {r.dayChange != null && <div><Delta value={r.dayChange} className="!px-1.5 !py-0 text-[10px]" /></div>}
                          </td>
                          <td className={cn('text-right px-3 py-3 num font-semibold', r.pnl == null ? 'text-muted-foreground' : r.pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                            {signed(r.pnl, decimalsFor(r.currency))}
                            {r.pnlPct != null && <div className="text-xs font-medium">{signed(r.pnlPct)}%</div>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <i className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, weight)}%`, background: m.color }} />
                              </div>
                              <span className="text-xs text-muted-foreground num w-10 text-right">{weight.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <PortfolioAI
            holdings={aiHoldings}
            prices={aiPrices}
            totalCost={total.cost}
            totalValue={total.value}
            totalPnl={totalPnl}
            apiKey={apiKey}
            onOpenSettings={onOpenSettings}
          />
        </>
      )}
    </div>
  )
}

function Metric({ label, note, tone, extra, children }) {
  return (
    <div className="panel p-5">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <p className={cn('text-[26px] leading-tight font-bold num', tone)}>{children}</p>
        {extra}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{note}</p>
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
    <div className="panel p-5">
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
          className="flex-1 px-4 py-2 rounded-lg bg-muted/70 border border-transparent text-foreground focus:outline-none focus:bg-card focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition text-sm"
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
        <div className="prose dark:prose-invert prose-sm max-w-none text-sm leading-relaxed text-foreground/90 prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{insight}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
