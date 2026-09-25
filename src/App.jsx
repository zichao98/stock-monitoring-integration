import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react'
import { CURRENCY_PAIRS, TAIWAN_STOCKS, US_STOCKS, DEFAULT_CONFIG } from './config.js'
import { useRateData } from './hooks/useRateData.js'
import { useStockData } from './hooks/useStockData.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useCountdown } from './hooks/useCountdown.js'
import { computeSignals } from './lib/signals.js'
import { percentChange } from './lib/indicators.js'
import CurrencyCardContainer from './components/CurrencyCardContainer.jsx'
import StockCardContainer from './components/StockCardContainer.jsx'
import StockSearch from './components/StockSearch.jsx'
import CurrencySearch from './components/CurrencySearch.jsx'
import Portfolio from './components/Portfolio.jsx'
import ChartView from './components/ChartView.jsx'
import SignalBadge from './components/SignalBadge.jsx'
import AIPanel from './components/AIPanel.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import AlertSettings from './components/AlertSettings.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { Settings, Activity, RefreshCw, AlertTriangle, LineChart, CandlestickChart, Timer, X, Plus, Wallet } from 'lucide-react'
import { cn } from './lib/utils.js'
import { AnimatedNumber, CountdownRing, Delta } from './components/ui.jsx'

const DEFAULT_STOCK_TABS = [
  { id: 'tw-stocks', label: 'Taiwan Stocks', stocks: TAIWAN_STOCKS },
  { id: 'us-stocks', label: 'US Stocks', stocks: US_STOCKS },
]

let tabIdCounter = 0

export default function App() {
  const [activeTab, setActiveTab] = useState('fx')
  const [activePairId, setActivePairId] = useState('MYR-TWD')
  const [activeStockId, setActiveStockId] = useState('TW-0050')
  const [config, setConfig] = useLocalStorage('fx-config', DEFAULT_CONFIG)
  const [apiKey, setApiKey] = useLocalStorage('openrouter-key', '')
  const [alerts, setAlerts] = useLocalStorage('fx-alerts', {})
  const [stockTabs, setStockTabs] = useLocalStorage('fx-stock-tabs', DEFAULT_STOCK_TABS)
  const [currencyPairs, setCurrencyPairs] = useLocalStorage('fx-currency-pairs', CURRENCY_PAIRS)
  const [portfolio, setPortfolio] = useLocalStorage('fx-portfolio', [])
  const [showAlertSettings, setShowAlertSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeAlerts, setActiveAlerts] = useState([])
  const [renamingTab, setRenamingTab] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const switchTab = useCallback((id) => {
    const apply = () => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'instant' }) }
    if (document.startViewTransition && id !== activeTab && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply)
    else apply()
  }, [activeTab])

  const activePair = currencyPairs.find(p => p.id === activePairId)
  const allStocks = stockTabs.flatMap(t => t.stocks)
  const activeStock = allStocks.find(s => s.id === activeStockId)
  const activeStockTab = stockTabs.find(t => t.id === activeTab)

  const fxData = useRateData(activePair, config.pollingInterval)
  const stockData = useStockData(activeStock, config.pollingInterval)

  const isFxTab = activeTab === 'fx'
  const isPortfolioTab = activeTab === 'portfolio'
  const currentData = isFxTab ? fxData : stockData
  const { history, loading, error, refresh, lastUpdated } = currentData
  const currentValue = isFxTab ? fxData.currentRate : stockData.currentPrice
  const intradayData = isFxTab ? fxData.intradayHistory : stockData.intradayHistory
  const secondsLeft = useCountdown(lastUpdated, config.pollingInterval)

  const { signals, current: currentSignal } = useMemo(() => {
    return computeSignals(history, config)
  }, [history, config])

  const activeItemId = isFxTab ? activePairId : activeStockId

  // Check alerts
  useEffect(() => {
    if (currentValue == null || !signals.length) return
    const itemAlerts = alerts[activeItemId]
    if (!itemAlerts) return

    const newAlerts = []
    if (itemAlerts.buyTarget && currentValue <= itemAlerts.buyTarget) {
      newAlerts.push({ type: 'buy', pair: activeItemId, rate: currentValue, target: itemAlerts.buyTarget })
    }
    if (itemAlerts.sellTarget && currentValue >= itemAlerts.sellTarget) {
      newAlerts.push({ type: 'sell', pair: activeItemId, rate: currentValue, target: itemAlerts.sellTarget })
    }

    if (newAlerts.length > 0) {
      setActiveAlerts(prev => {
        const existing = prev.find(a => a.pair === activeItemId && a.rate === currentValue)
        if (existing) return prev
        return [...prev, ...newAlerts]
      })

      if (Notification.permission === 'granted') {
        newAlerts.forEach(a => {
          new Notification(`${a.pair} ${a.type.toUpperCase()} Alert!`, {
            body: `${isFxTab ? 'Rate' : 'Price'} ${a.rate.toFixed(isFxTab ? 4 : 2)} hit your ${a.type} target of ${a.target}`,
          })
        })
      }
    }
  }, [currentValue, alerts, activeItemId, signals, isFxTab])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleSaveAlerts = useCallback((newAlerts) => {
    setAlerts(prev => ({ ...prev, [activeItemId]: newAlerts }))
  }, [activeItemId, setAlerts])

  const handleToggleAlert = useCallback(() => {
    setShowAlertSettings(true)
  }, [])

  const handleSaveSettings = useCallback((newConfig, newKey) => {
    setConfig(newConfig)
    setApiKey(newKey)
  }, [setConfig, setApiKey])

  const handleAddStock = useCallback((stock) => {
    if (!activeStockTab) return
    setStockTabs(prev => prev.map(tab => {
      if (tab.id !== activeStockTab.id) return tab
      if (tab.stocks.some(s => s.yahooSymbol === stock.yahooSymbol)) return tab
      return { ...tab, stocks: [...tab.stocks, stock] }
    }))
  }, [activeStockTab, setStockTabs])

  const handleRemoveStock = useCallback((yahooSymbol) => {
    const stock = activeStockTab?.stocks.find(s => s.yahooSymbol === yahooSymbol)
    setConfirmDelete({
      message: `Remove ${stock?.label || stock?.symbol || yahooSymbol} from this tab?`,
      onConfirm: () => {
        if (!activeStockTab) return
        setStockTabs(prev => prev.map(tab => {
          if (tab.id !== activeStockTab.id) return tab
          return { ...tab, stocks: tab.stocks.filter(s => s.yahooSymbol !== yahooSymbol) }
        }))
      },
    })
  }, [activeStockTab, setStockTabs])

  const handleAddTab = useCallback(() => {
    const name = window.prompt('Enter tab name:')
    if (!name || !name.trim()) return
    const id = `custom-${Date.now()}-${tabIdCounter++}`
    const newTab = { id, label: name.trim(), stocks: [] }
    setStockTabs(prev => [...prev, newTab])
    setActiveTab(id)
  }, [setStockTabs])

  const handleRemoveTab = useCallback((tabId) => {
    const tab = stockTabs.find(t => t.id === tabId)
    setConfirmDelete({
      message: `Delete tab "${tab?.label || tabId}" and all its stocks?`,
      onConfirm: () => {
        setStockTabs(prev => {
          const filtered = prev.filter(t => t.id !== tabId)
          if (activeTab === tabId) {
            setActiveTab('fx')
          }
          return filtered
        })
      },
    })
  }, [setStockTabs, activeTab, stockTabs])

  const handleRenameTab = useCallback((tabId) => {
    const tab = stockTabs.find(t => t.id === tabId)
    if (!tab) return
    setRenamingTab(tabId)
    setRenameValue(tab.label)
  }, [stockTabs])

  const handleRenameSubmit = useCallback(() => {
    if (!renamingTab || !renameValue.trim()) {
      setRenamingTab(null)
      return
    }
    setStockTabs(prev => prev.map(t =>
      t.id === renamingTab ? { ...t, label: renameValue.trim() } : t
    ))
    setRenamingTab(null)
  }, [renamingTab, renameValue, setStockTabs])

  const handleRemoveFromAllTabs = useCallback((yahooSymbol) => {
    setStockTabs(prev => prev.map(tab => ({
      ...tab,
      stocks: tab.stocks.filter(s => s.yahooSymbol !== yahooSymbol)
    })))
  }, [setStockTabs])

  const handleAddCurrencyPair = useCallback((pair) => {
    setCurrencyPairs(prev => {
      if (prev.some(p => p.id === pair.id)) return prev
      return [...prev, pair]
    })
  }, [setCurrencyPairs])

  const handleRemoveCurrencyPair = useCallback((pairId) => {
    const pair = currencyPairs.find(p => p.id === pairId)
    setConfirmDelete({
      message: `Remove currency pair ${pair?.base}/${pair?.target}?`,
      onConfirm: () => {
        setCurrencyPairs(prev => prev.filter(p => p.id !== pairId))
      },
    })
  }, [setCurrencyPairs, currencyPairs])

  const handleAddHolding = useCallback((holding) => {
    setPortfolio(prev => [...prev, holding])
  }, [setPortfolio])

  const handleRemoveHolding = useCallback((holdingId) => {
    const holding = portfolio.find(h => h.id === holdingId)
    setConfirmDelete({
      message: `Remove ${holding?.symbol || holdingId} from your portfolio?`,
      onConfirm: () => {
        setPortfolio(prev => prev.filter(h => h.id !== holdingId))
      },
    })
  }, [setPortfolio, portfolio])

  const prevRate = history.length > 1 ? history[history.length - 2].rate : null
  const dailyChange = percentChange(currentValue || 0, prevRate)

  const activeDisplayLabel = isFxTab
    ? `${activePair?.base}/${activePair?.target}`
    : `${activeStock?.symbol} — ${activeStock?.label}`

  const alertItem = isFxTab
    ? { ...activePair, displayLabel: `${activePair?.base}/${activePair?.target}`, assetType: 'forex' }
    : { ...activeStock, displayLabel: `${activeStock?.symbol} — ${activeStock?.label}`, assetType: 'stock' }

  const rateDecimals = isFxTab ? 4 : 2

  const lastUpdatedLabel = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  const navItems = [
    { id: 'fx', label: 'Forex', icon: LineChart },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    ...stockTabs.map(tab => ({ id: tab.id, label: tab.label, icon: CandlestickChart, removable: true })),
  ]
  const segmentedProps = {
    items: navItems,
    active: activeTab,
    onSelect: switchTab,
    renaming: renamingTab,
    renameValue,
    setRenameValue,
    onRenameSubmit: handleRenameSubmit,
    onRenameCancel: () => setRenamingTab(null),
    onRename: handleRenameTab,
    onRemove: handleRemoveTab,
    onAdd: handleAddTab,
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/75 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => switchTab('fx')} className="flex items-center gap-2.5 flex-none text-left">
            <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white shadow-[0_4px_12px_rgb(10_132_255/.35)]">
              <Activity className="w-5 h-5" strokeWidth={2.4} />
            </span>
            <span className="leading-tight">
              <strong className="block text-[15px] tracking-tight">Stock Monitor</strong>
              <small className="block text-[9px] tracking-[.14em] text-muted-foreground">STOCKS · FX · SIGNALS</small>
            </span>
          </button>

          <Segmented className="hidden md:flex min-w-0" {...segmentedProps} />

          <div className="ml-auto flex items-center gap-2 flex-none">
            {activeAlerts.length > 0 && (
              <button
                onClick={() => setActiveAlerts([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 text-red-500 text-xs font-semibold animate-pulse-glow-red"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {activeAlerts.length}<span className="hidden sm:inline"> Alert{activeAlerts.length > 1 ? 's' : ''}</span>
              </button>
            )}
            {!isPortfolioTab && <CountdownRing seconds={secondsLeft} total={config.pollingInterval} />}
            <button onClick={refresh} className="round-button" title="Refresh now" aria-label="Refresh now">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button onClick={() => setShowSettings(true)} className="round-button" title="Settings" aria-label="Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs on small screens */}
        <div className="md:hidden px-4 pb-3">
          <Segmented {...segmentedProps} />
        </div>
      </header>

      {/* Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 space-y-2">
          {activeAlerts.map((a, i) => (
            <div
              key={i}
              className={cn(
                'arrive flex items-center justify-between gap-3 px-4 py-3 rounded-lg',
                a.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 flex-none" />
                <span className="text-sm font-medium">
                  {a.pair} — {a.type.toUpperCase()} target reached! {isFxTab ? 'Rate' : 'Price'} {a.rate.toFixed(rateDecimals)} hit your target of {a.target}
                </span>
              </div>
              <button
                onClick={() => setActiveAlerts(prev => prev.filter((_, idx) => idx !== i))}
                className="text-xs font-semibold hover:underline flex-none"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      <main key={activeTab} className="page-in flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Page heading */}
        <section className="arrive pt-1">
          <p className="eyebrow">{isFxTab ? 'FOREX' : isPortfolioTab ? 'PORTFOLIO' : 'WATCHLIST'}</p>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">
            {isFxTab ? 'Currency pairs' : isPortfolioTab ? 'My holdings' : activeStockTab?.label}
          </h1>
          {!isPortfolioTab && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {isFxTab ? `${currencyPairs.length} pairs` : `${activeStockTab?.stocks.length || 0} stocks`} · updates every {config.pollingInterval}s{lastUpdatedLabel ? ` · last ${lastUpdatedLabel}` : ''}
            </p>
          )}
        </section>

        {/* Search bar for stock tabs */}
        {activeStockTab && (
          <div className="arrive relative z-30" style={{ '--i': 1 }}>
            <StockSearch
              watchlist={activeStockTab.stocks}
              onAdd={handleAddStock}
              onRemove={handleRemoveStock}
            />
          </div>
        )}

        {/* Search bar for forex tab */}
        {isFxTab && (
          <div className="arrive relative z-30" style={{ '--i': 1 }}>
            <CurrencySearch
              pairs={currencyPairs}
              onAdd={handleAddCurrencyPair}
              onRemove={handleRemoveCurrencyPair}
            />
          </div>
        )}

        {/* Portfolio Tab */}
        {isPortfolioTab && (
          <div className="arrive" style={{ '--i': 1 }}>
            <Portfolio
              holdings={portfolio}
              onAdd={handleAddHolding}
              onRemove={handleRemoveHolding}
              onUpdate={() => {}}
              apiKey={apiKey}
              onOpenSettings={() => setShowSettings(true)}
            />
          </div>
        )}

        {/* Cards Grid */}
        {isFxTab ? (
          currencyPairs.length === 0 ? (
            <EmptyState icon={LineChart}>No currency pairs yet. Use the search bar above to add one.</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {currencyPairs.map((pair, i) => (
                <CurrencyCardContainer
                  key={pair.id}
                  index={i + 2}
                  pair={pair}
                  config={config}
                  alerts={alerts[pair.id]}
                  onToggleAlert={() => { setActivePairId(pair.id); setShowAlertSettings(true) }}
                  onSelect={() => setActivePairId(pair.id)}
                  onRemove={() => handleRemoveCurrencyPair(pair.id)}
                  isActive={activePairId === pair.id}
                />
              ))}
            </div>
          )
        ) : activeStockTab ? (
          activeStockTab.stocks.length === 0 ? (
            <EmptyState icon={CandlestickChart}>This tab is empty. Use the search bar above to add stocks.</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeStockTab.stocks.map((stock, i) => (
                <StockCardContainer
                  key={stock.id}
                  index={i + 2}
                  stock={stock}
                  config={config}
                  alerts={alerts[stock.id]}
                  onToggleAlert={() => { setActiveStockId(stock.id); setShowAlertSettings(true) }}
                  onSelect={() => setActiveStockId(stock.id)}
                  onRemove={() => handleRemoveStock(stock.yahooSymbol)}
                  isActive={activeStockId === stock.id}
                />
              ))}
            </div>
          )
        ) : null}

        {/* Error */}
        {error && !isPortfolioTab && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to fetch latest {isFxTab ? 'rate' : 'price'}: {error}. Retrying automatically…</span>
          </div>
        )}

        {/* Main Content Grid */}
        {!isPortfolioTab && (isFxTab ? activePair : activeStock) && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Chart */}
          <div className="arrive lg:col-span-2 panel p-5 sm:p-6 min-w-0" style={{ '--i': 4 }}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <p className="eyebrow">{isFxTab ? 'RATE HISTORY' : 'PRICE HISTORY'} · WITH INDICATORS</p>
                <h2 className="text-xl font-semibold tracking-tight truncate">{activeDisplayLabel}</h2>
                {currentValue != null && (
                  <div className="flex items-center gap-2.5 mt-2">
                    <AnimatedNumber value={currentValue} decimals={rateDecimals} className="text-[40px] leading-none font-bold" />
                    <Delta value={prevRate != null ? dailyChange : null} className="text-sm" />
                  </div>
                )}
              </div>
              {currentSignal && <SignalBadge signal={currentSignal} size="lg" />}
            </div>
            <ChartView signals={signals} pair={isFxTab ? activePair : activeStock} intradayData={intradayData} />
          </div>

          {/* AI Panel */}
          <div className="arrive lg:col-span-1 min-w-0" style={{ '--i': 5 }}>
            <AIPanel
              pair={isFxTab ? activePair : activeStock}
              currentRate={currentValue}
              signals={signals}
              history={history}
              apiKey={apiKey}
              onOpenSettings={() => setShowSettings(true)}
              assetType={isFxTab ? 'forex' : 'stock'}
            />
          </div>
        </div>
        )}

        {/* Signal Details */}
        {currentSignal && !isPortfolioTab && (
          <div className="arrive panel p-5 sm:p-6" style={{ '--i': 6 }}>
            <p className="eyebrow">LATEST SIGNAL</p>
            <h3 className="text-lg font-semibold tracking-tight mb-4">{activeDisplayLabel}</h3>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <StatBox label="Signal" value={currentSignal.type} highlight={currentSignal.type} />
              <StatBox label="Confidence" value={`${currentSignal.confidence.toFixed(0)}%`} meter={currentSignal.confidence} />
              <StatBox label="RSI" value={currentSignal.rsi?.toFixed(1) || '—'} meter={currentSignal.rsi} />
              <StatBox label={isFxTab ? 'Rate' : 'Price'} value={currentSignal.rate.toFixed(rateDecimals)} />
            </div>
            <div className="mt-5">
              <p className="eyebrow mb-2">REASONS</p>
              <ul className="space-y-2">
                {currentSignal.reasons.map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-none" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 pb-8 pt-2 text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
        <span>Data: Yahoo Finance · AI: OpenRouter</span>
        <span>Not financial advice. Always do your own research.</span>
      </footer>

      {/* Modals */}
      {showAlertSettings && (
        <AlertSettings
          item={alertItem}
          alerts={alerts[activeItemId]}
          onSave={handleSaveAlerts}
          onClose={() => setShowAlertSettings(false)}
        />
      )}
      {showSettings && (
        <SettingsModal
          config={config}
          apiKey={apiKey}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {confirmDelete && (
        <div className="sheet-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="sheet panel p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center w-10 h-10 rounded-full bg-red-500/15">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold">Confirm removal</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{confirmDelete.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-full bg-muted hover:bg-input text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDelete.onConfirm()
                  setConfirmDelete(null)
                }}
                className="px-4 py-2 rounded-full bg-red-500 text-white hover:brightness-110 text-sm font-semibold transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <AIChatWidget apiKey={apiKey} onOpenSettings={() => setShowSettings(true)} />
    </div>
  )
}

/** Pill navigation with a thumb that slides to the active item. */
function Segmented({ items, active, onSelect, className, renaming, renameValue, setRenameValue, onRenameSubmit, onRenameCancel, onRename, onRemove, onAdd }) {
  const refs = useRef({})
  const [thumb, setThumb] = useState(null)
  const layoutKey = items.map(i => i.label).join('|')
  useLayoutEffect(() => {
    const el = refs.current[active]
    if (!el || !el.offsetWidth) return setThumb(null)
    setThumb({ x: el.offsetLeft, w: el.offsetWidth })
  }, [active, layoutKey, renaming])
  useEffect(() => {
    const el = refs.current[active]
    const nav = el?.parentElement
    if (el && nav && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' })
  }, [active])

  return (
    <nav className={cn('segmented', className)}>
      {thumb && <i className="thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />}
      {items.map(({ id, label, icon: Icon, removable }) => (
        <div key={id} ref={el => { refs.current[id] = el }} className="relative z-[1] flex items-center flex-none">
          {renaming === id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={onRenameSubmit}
              onKeyDown={e => { if (e.key === 'Enter') onRenameSubmit(); if (e.key === 'Escape') onRenameCancel() }}
              className="mx-1 px-3 py-1.5 w-32 rounded-full bg-card text-sm focus:outline-none ring-2 ring-primary/60"
            />
          ) : (
            <button
              onClick={() => onSelect(id)}
              onDoubleClick={() => removable && onRename(id)}
              className={cn('flex items-center gap-1.5', active === id && 'active', removable && active === id && '!pr-1.5')}
              title={removable ? 'Double-click to rename' : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )}
          {removable && active === id && renaming !== id && (
            <button
              onClick={() => onRemove(id)}
              className="!p-1.5 mr-1.5 rounded-full text-muted-foreground hover:text-red-500"
              title="Remove tab"
              aria-label={`Remove ${label} tab`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button onClick={onAdd} className="relative z-[1] flex-none !px-3 hover:text-primary" title="Add new tab" aria-label="Add new tab">
        <Plus className="w-4 h-4" />
      </button>
    </nav>
  )
}

function EmptyState({ icon: Icon, children }) {
  return (
    <div className="arrive panel flex flex-col items-center justify-center py-16 text-muted-foreground" style={{ '--i': 2 }}>
      <span className="grid place-items-center w-14 h-14 rounded-full bg-muted mb-3"><Icon className="w-6 h-6" /></span>
      <p className="text-sm">{children}</p>
    </div>
  )
}

function StatBox({ label, value, highlight, meter }) {
  const colorClass = highlight === 'BUY' ? 'text-green-500' : highlight === 'SELL' ? 'text-red-500' : 'text-yellow-500'
  return (
    <div className="p-4 rounded-lg bg-muted/60">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-xl font-bold num', highlight ? colorClass : '')}>{value}</p>
      {meter != null && Number.isFinite(meter) && (
        <div className="mt-2 h-1.5 rounded-full bg-background/60 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </div>
      )}
    </div>
  )
}
