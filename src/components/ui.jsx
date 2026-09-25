import { useEffect, useId, useRef, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts'
import { usePalette } from '../lib/theme.js'
import { cn } from '../lib/utils.js'

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Tweens to each new value and flashes green/red for the direction of the move. */
export function AnimatedNumber({ value, decimals = 2, className }) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState('')
  const previous = useRef(value)

  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (value == null || from == null || from === value || reducedMotion()) { setShown(value); return }
    setFlash(value > from ? 'flash-up' : 'flash-down')
    const start = performance.now(), duration = 650
    let frame
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3)
      setShown(from + (value - from) * eased)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    const clear = setTimeout(() => setFlash(''), 1100)
    return () => { cancelAnimationFrame(frame); clearTimeout(clear) }
  }, [value])

  return <span className={cn('num', flash, className)}>{shown == null ? '—' : shown.toFixed(decimals)}</span>
}

/** Small area chart coloured by direction. */
export function Sparkline({ data, up, className }) {
  const p = usePalette()
  const id = useId().replace(/:/g, '')
  const color = up ? p.green : p.red
  if (!data || data.length < 2) return <div className={className} />
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area type="monotone" dataKey="rate" stroke={color} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Up/down percentage pill. */
export function Delta({ value, className }) {
  if (value == null || !Number.isFinite(value)) return null
  const up = value >= 0
  return (
    <span className={cn('num inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      up ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500', className)}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

/** Circular countdown to the next automatic refresh. */
export function CountdownRing({ seconds, total, size = 36 }) {
  const r = size / 2 - 3, c = 2 * Math.PI * r
  const progress = total ? Math.max(0, Math.min(1, seconds / total)) : 0
  return (
    <div className="relative grid place-items-center flex-none" style={{ width: size, height: size }} title="Time until next update">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <span className="absolute text-[10px] font-semibold num text-muted-foreground">{seconds}</span>
    </div>
  )
}
