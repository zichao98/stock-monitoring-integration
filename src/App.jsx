import { useState, useEffect, useMemo, useCallback } from 'react'
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
import ChartView from './components/ChartView.jsx'
import SignalBadge from './components/SignalBadge.jsx'
import AIPanel from './components/AIPanel.jsx'
import AlertSettings from './components/AlertSettings.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { Settings, Activity, RefreshCw, AlertTriangle, LineChart, CandlestickChart, Timer, X, Plus } from 'lucide-react'
import { cn } from './lib/utils.js'

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
  const [apiKey, setApiKey] = useLocalStorage('fx-gemini-key', '')
  const [alerts, setAlerts] = useLocalStorage('fx-alerts', {})
  const [stockTabs, setStockTabs] = useLocalStorage('fx-stock-tabs', DEFAULT_STOCK_TABS)
  const [currencyPairs, setCurrencyPairs] = useLocalStorage('fx-currency-pairs', CURRENCY_PAIRS)
  const [showAlertSettings, setShowAlertSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeAlerts, setActiveAlerts] = useState([])
  const [renamingTab, setRenamingTab] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const activePair = currencyPairs.find(p => p.id === activePairId)
  const allStocks = stockTabs.flatMap(t => t.stocks)
  const activeStock = allStocks.find(s => s.id === activeStockId)
  const activeStockTab = stockTabs.find(t => t.id === activeTab)

  const fxData = useRateData(activePair, config.pollingInterval)
  const stockData = useStockData(activeStock, config.pollingInterval)

  const isFxTab = activeTab === 'fx'
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

  const prevRate = history.length > 1 ? history[history.length - 2].rate : null
  const dailyChange = percentChange(currentValue || 0, prevRate)

  const activeDisplayLabel = isFxTab
    ? `${activePair.base}/${activePair.target}`
    : `${activeStock.symbol} — ${activeStock.label}`

  const alertItem = isFxTab
    ? { ...activePair, displayLabel: `${activePair.base}/${activePair.target}`, assetType: 'forex' }
    : { ...activeStock, displayLabel: `${activeStock.symbol} — ${activeStock.label}`, assetType: 'stock' }

  const rateDecimals = isFxTab ? 4 : 2

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Stop Monitor</h1>
              <p className="text-xs text-muted-foreground">FX & Stock trading signals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAlerts.length > 0 && (
              <button
                onClick={() => setActiveAlerts([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium animate-pulse-glow-red"
              >
                <AlertTriangle className="w-4 h-4" />
                {activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm tabular-nums" title="Time until next update">
              <Timer className="w-4 h-4" />
              <span>{secondsLeft}s</span>
            </div>
            <button
              onClick={refresh}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh now"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 items-center">
            <button
              onClick={() => setActiveTab('fx')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'fx'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <LineChart className="w-4 h-4" />
              Forex
            </button>
            {stockTabs.map(tab => (
              <div key={tab.id} className="flex items-center group">
                {renamingTab === tab.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingTab(null) }}
                    className="px-2 py-1 text-sm border-b-2 border-primary bg-transparent text-foreground focus:outline-none w-32"
                  />
                ) : (
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    onDoubleClick={() => handleRenameTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <CandlestickChart className="w-4 h-4" />
                    {tab.label}
                  </button>
                )}
                <button
                  onClick={() => handleRemoveTab(tab.id)}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddTab}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-primary transition-colors"
              title="Add new tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          {activeAlerts.map((a, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border mb-2',
                a.type === 'buy' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
              )}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {a.pair} — {a.type.toUpperCase()} target reached! {isFxTab ? 'Rate' : 'Price'} {a.rate.toFixed(rateDecimals)} hit your target of {a.target}
                </span>
              </div>
              <button
                onClick={() => setActiveAlerts(prev => prev.filter((_, idx) => idx !== i))}
                className="text-xs hover:underline"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search bar for stock tabs */}
        {activeStockTab && (
          <StockSearch
            watchlist={activeStockTab.stocks}
            onAdd={handleAddStock}
            onRemove={handleRemoveStock}
          />
        )}

        {/* Search bar for forex tab */}
        {isFxTab && (
          <CurrencySearch
            pairs={currencyPairs}
            onAdd={handleAddCurrencyPair}
            onRemove={handleRemoveCurrencyPair}
          />
        )}

        {/* Cards Grid */}
        {isFxTab ? (
          currencyPairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <LineChart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No currency pairs. Use the search bar above to add pairs.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {currencyPairs.map(pair => (
                <div key={pair.id} className="relative">
                  <CurrencyCardContainer
                    pair={pair}
                    config={config}
                    alerts={alerts[pair.id]}
                    onToggleAlert={() => { setActivePairId(pair.id); setShowAlertSettings(true) }}
                    onSelect={() => setActivePairId(pair.id)}
                    isActive={activePairId === pair.id}
                  />
                  <button
                    onClick={() => handleRemoveCurrencyPair(pair.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-muted/80 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove pair"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : activeStockTab ? (
          activeStockTab.stocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CandlestickChart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">This tab is empty. Use the search bar above to add stocks.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeStockTab.stocks.map(stock => (
                <div key={stock.id} className="relative">
                  <StockCardContainer
                    stock={stock}
                    config={config}
                    alerts={alerts[stock.id]}
                    onToggleAlert={() => { setActiveStockId(stock.id); setShowAlertSettings(true) }}
                    onSelect={() => setActiveStockId(stock.id)}
                    isActive={activeStockId === stock.id}
                  />
                  <button
                    onClick={() => handleRemoveStock(stock.yahooSymbol)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-muted/80 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove from tab"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to fetch latest {isFxTab ? 'rate' : 'price'}: {error}. Retrying automatically...</span>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{activeDisplayLabel}</h2>
                <p className="text-xs text-muted-foreground">
                  {isFxTab ? 'Rate history with technical indicators' : 'Price history with technical indicators'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {currentValue != null && (
                  <div className="text-right">
                    <div className="text-xl font-bold tabular-nums">{currentValue.toFixed(rateDecimals)}</div>
                    <div className={cn('text-xs font-medium', dailyChange >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}% today
                    </div>
                  </div>
                )}
                {currentSignal && <SignalBadge signal={currentSignal} size="lg" />}
              </div>
            </div>
            <ChartView signals={signals} pair={isFxTab ? activePair : activeStock} intradayData={intradayData} />
          </div>

          {/* AI Panel */}
          <div className="lg:col-span-1">
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

        {/* Signal Details */}
        {currentSignal && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-bold mb-3">Latest Signal Analysis — {activeDisplayLabel}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatBox label="Signal" value={currentSignal.type} highlight={currentSignal.type} />
              <StatBox label="Confidence" value={`${currentSignal.confidence.toFixed(0)}%`} />
              <StatBox label="RSI" value={currentSignal.rsi?.toFixed(1) || '—'} />
              <StatBox label={isFxTab ? 'Rate' : 'Price'} value={currentSignal.rate.toFixed(rateDecimals)} />
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Reasons:</p>
              <ul className="space-y-1">
                {currentSignal.reasons.map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-4">
          <p>FX & Stocks: Yahoo Finance (real-time) • Historical: frankfurter.app • AI: Google Gemini</p>
          <p className="mt-1">This is not financial advice. Always do your own research.</p>
        </footer>
      </main>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDelete(null)}>
          <div className="rounded-xl border border-border bg-card p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/15">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-foreground">Confirm Removal</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">{confirmDelete.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDelete.onConfirm()
                  setConfirmDelete(null)
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, highlight }) {
  const colorClass = highlight === 'BUY' ? 'text-green-400' : highlight === 'SELL' ? 'text-red-400' : 'text-yellow-400'
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', highlight ? colorClass : '')}>{value}</p>
    </div>
  )
}
