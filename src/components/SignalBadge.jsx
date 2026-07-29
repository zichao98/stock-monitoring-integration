import { cn } from '../lib/utils.js'
import { formatSignal } from '../lib/signals.js'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function SignalBadge({ signal, size = 'md' }) {
  const { label, color, bg } = formatSignal(signal)
  const Icon = signal?.type === 'BUY' ? TrendingUp : signal?.type === 'SELL' ? TrendingDown : Minus

  const sizeClasses = size === 'lg' ? 'text-lg px-4 py-2' : 'text-sm px-3 py-1'
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full font-semibold', color, bg, sizeClasses)}>
      <Icon className={iconSize} />
      {label}
      {signal?.confidence != null && signal.type !== 'HOLD' && (
        <span className="opacity-70">({signal.confidence.toFixed(0)}%)</span>
      )}
    </div>
  )
}
