import { cn } from '../lib/utils.js'
import { formatSignal } from '../lib/signals.js'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function SignalBadge({ signal, size = 'md' }) {
  const { label, color, bg } = formatSignal(signal)
  const Icon = signal?.type === 'BUY' ? TrendingUp : signal?.type === 'SELL' ? TrendingDown : Minus

  const sizeClasses = size === 'lg' ? 'text-sm px-3.5 py-1.5' : 'text-[11px] px-2.5 py-1'
  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap tracking-wide', color, bg, sizeClasses)}>
      <Icon className={iconSize} />
      {label}
      {signal?.confidence != null && signal.type !== 'HOLD' && (
        <span className="opacity-70">({signal.confidence.toFixed(0)}%)</span>
      )}
    </div>
  )
}
