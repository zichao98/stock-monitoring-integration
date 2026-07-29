import { useState, useEffect, useMemo, useCallback } from 'react'
import { CURRENCY_PAIRS, TAIWAN_STOCKS, US_STOCKS, DEFAULT_CONFIG } from './config.js'
import { useRateData } from './hooks/useRateData.js'
import { useStockData } from './hooks/useStockData.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { computeSignals } from './lib/signals.js'
import { percentChange } from './lib/indicators.js'
import CurrencyCardContainer from './components/CurrencyCardContainer.jsx'
import StockCardContainer from './components/StockCardContainer.jsx'
import ChartView from './components/ChartView.jsx'
import SignalBadge from './components/SignalBadge.jsx'
import AIPanel from './components/AIPanel.jsx'
import AlertSettings from './components/AlertSettings.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { Settings, Activity, RefreshCw, AlertTriangle, LineChart, CandlestickChart } from 'lucide-react'
import { cn } from './lib/utils.js'

const TABS = [
  { id: 'fx', label: 'Forex', icon: LineChart },
  { id: 'tw-stocks', label: 'Taiwan Stocks', icon: CandlestickChart },
  { id: 'us-stocks', label: 'US Stocks', icon: CandlestickChart },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('fx')
  const [activePairId, setActivePairId] = useState('MYR-TWD')
  const [activeStockId, setActiveStockId] = useState('TW-0050')
  const [config, setConfig] = useLocalStorage('fx-config', DEFAULT_CONFIG)
  const [apiKey, setApiKey] = useLocalStorage('fx-gemini-key', '')
  const [alerts, setAlerts] = useLocalStorage('fx-alerts', {})
  const [showAlertSettings, setShowAlertSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeAlerts, setActiveAlerts] = useState([])

  const activePair = CURRENCY_PAIRS.find(p => p.id === activePairId)
  const activeStock = [...TAIWAN_STOCKS, ...US_STOCKS].find(s => s.id === activeStockId)

  const fxData = useRateData(activePair, config.pollingInterval)
  const stockData = useStockData(activeStock, config.pollingInterval)

  const isFxTab = activeTab === 'fx'
  const currentData = isFxTab ? fxData : stockData
  const { history, loading, error, refresh } = currentData
  const currentValue = isFxTab ? fxData.currentRate : stockData.currentPrice

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
          <div className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
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
        {/* Cards Grid */}
        {isFxTab ? (
          <div className="grid gap-4 md:grid-cols-2">
            {CURRENCY_PAIRS.map(pair => (
              <CurrencyCardContainer
                key={pair.id}
                pair={pair}
                config={config}
                alerts={alerts[pair.id]}
                onToggleAlert={() => { setActivePairId(pair.id); setShowAlertSettings(true) }}
                onSelect={() => setActivePairId(pair.id)}
                isActive={activePairId === pair.id}
              />
            ))}
          </div>
        ) : activeTab === 'tw-stocks' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TAIWAN_STOCKS.map(stock => (
              <StockCardContainer
                key={stock.id}
                stock={stock}
                config={config}
                alerts={alerts[stock.id]}
                onToggleAlert={() => { setActiveStockId(stock.id); setShowAlertSettings(true) }}
                onSelect={() => setActiveStockId(stock.id)}
                isActive={activeStockId === stock.id}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {US_STOCKS.map(stock => (
              <StockCardContainer
                key={stock.id}
                stock={stock}
                config={config}
                alerts={alerts[stock.id]}
                onToggleAlert={() => { setActiveStockId(stock.id); setShowAlertSettings(true) }}
                onSelect={() => setActiveStockId(stock.id)}
                isActive={activeStockId === stock.id}
              />
            ))}
          </div>
        )}

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
            <ChartView signals={signals} pair={isFxTab ? activePair : activeStock} />
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
          <p>FX: open.er-api.com & frankfurter.app • Stocks: Yahoo Finance • AI: Google Gemini</p>
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
