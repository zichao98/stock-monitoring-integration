import { cn } from '../lib/utils.js'
import { percentChange } from '../lib/indicators.js'
import SignalBadge from './SignalBadge.jsx'
import { AnimatedNumber, Delta, Sparkline } from './ui.jsx'
import { Bell, BellRing, X } from 'lucide-react'

/** Watchlist card shared by currency pairs and stocks. */
export default function AssetCard({ title, tag, subtitle, footnote, value, decimals, history, signal, alerts, onToggleAlert, onSelect, onRemove, isActive, index = 0 }) {
  const prev = history.length > 1 ? history[history.length - 2].rate : null
  const change = value != null && prev != null ? percentChange(value, prev) : null
  const up = (change ?? 0) >= 0
  const sparkData = history.slice(-30).map(h => ({ rate: h.rate }))

  const buyAlertHit = alerts?.buyTarget && value && value <= alerts.buyTarget
  const sellAlertHit = alerts?.sellTarget && value && value >= alerts.sellTarget
  const hasAlert = buyAlertHit || sellAlertHit

  return (
    <div
      onClick={onSelect}
      style={{ '--i': index }}
      className={cn(
        'panel tappable arrive group relative p-5',
        isActive && 'ring-2 ring-primary/70',
        hasAlert && 'animate-pulse-glow'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-semibold tracking-tight truncate">{title}</h3>
            {tag && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">{tag}</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1 flex-none">
          {signal && <SignalBadge signal={signal} />}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAlert() }}
            className={cn('p-1.5 rounded-full transition-colors', hasAlert ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
            title="Price alerts"
          >
            {hasAlert ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {value != null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <AnimatedNumber value={value} decimals={decimals} className="text-[30px] leading-none font-bold" />
              <Delta value={change} />
            </div>
          ) : (
            <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
          )}
          <p className="text-xs text-muted-foreground mt-2 num">{footnote}</p>
        </div>
        <Sparkline data={sparkData} up={up} className="w-28 h-12 flex-none" />
      </div>

      {(alerts?.buyTarget || alerts?.sellTarget) ? (
        <div className="flex gap-2 text-xs mt-4">
          {alerts.buyTarget && (
            <span className={cn('px-2.5 py-1 rounded-full num', buyAlertHit ? 'bg-green-500/15 text-green-500 font-semibold' : 'bg-muted text-muted-foreground')}>
              Buy ≤ {alerts.buyTarget}
            </span>
          )}
          {alerts.sellTarget && (
            <span className={cn('px-2.5 py-1 rounded-full num', sellAlertHit ? 'bg-red-500/15 text-red-500 font-semibold' : 'bg-muted text-muted-foreground')}>
              Sell ≥ {alerts.sellTarget}
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}
