import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'
import { cn } from '../lib/utils.js'
import { formatSignal } from '../lib/signals.js'
import { percentChange } from '../lib/indicators.js'
import SignalBadge from './SignalBadge.jsx'
import { ArrowUpRight, ArrowDownRight, Bell, BellRing } from 'lucide-react'

export default function CurrencyCard({ pair, currentRate, history, signal, alerts, onToggleAlert, onSelect, isActive }) {
  const prevRate = history.length > 1 ? history[history.length - 2].rate : null
  const change = percentChange(currentRate || 0, prevRate)
  const isUp = change >= 0

  const sparkData = history.slice(-30).map(h => ({ rate: h.rate }))
  const { color, bg } = formatSignal(signal)

  const buyAlertHit = alerts?.buyTarget && currentRate && currentRate <= alerts.buyTarget
  const sellAlertHit = alerts?.sellTarget && currentRate && currentRate >= alerts.sellTarget
  const hasAlert = buyAlertHit || sellAlertHit

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-5 cursor-pointer transition-all hover:border-primary/50',
        isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-card/80',
        hasAlert && 'animate-pulse-glow'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold">{pair.base} / {pair.target}</h3>
          <p className="text-xs text-muted-foreground">{pair.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAlert() }}
            className={cn('p-1.5 rounded-lg transition-colors', hasAlert ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            {hasAlert ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          {signal && <SignalBadge signal={signal} />}
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          {currentRate != null ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tabular-nums">{currentRate.toFixed(4)}</span>
              <span className={cn('flex items-center text-sm font-medium', isUp ? 'text-green-400' : 'text-red-400')}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          ) : (
            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {pair.base} 1 = {pair.target} {currentRate?.toFixed(4) || '---'}
          </p>
        </div>
        <div className="w-32 h-12">
          {sparkData.length > 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={isUp ? '#4ade80' : '#f87171'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {alerts?.buyTarget || alerts?.sellTarget ? (
        <div className="flex gap-2 text-xs">
          {alerts.buyTarget && (
            <span className={cn('px-2 py-1 rounded', buyAlertHit ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
              Buy ≤ {alerts.buyTarget}
            </span>
          )}
          {alerts.sellTarget && (
            <span className={cn('px-2 py-1 rounded', sellAlertHit ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground')}>
              Sell ≥ {alerts.sellTarget}
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}
