import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, LineChart } from 'recharts'
import { SIGNAL_BUY, SIGNAL_SELL } from '../lib/signals.js'
import { usePalette, tooltipStyle as makeTooltipStyle } from '../lib/theme.js'

const axis = { fontSize: 11, tickLine: false, axisLine: false }

export default function ChartView({ signals, pair, intradayData }) {
  const p = usePalette()
  const tooltipStyle = makeTooltipStyle(p)
  if (!signals || signals.length === 0) {
    return (
      <div className="h-80 rounded-lg bg-muted/60 animate-pulse grid place-items-center text-sm text-muted-foreground">
        Loading chart data…
      </div>
    )
  }

  const chartData = signals.map(s => ({
    date: s.date,
    rate: s.rate,
    shortSMA: s.shortSMA,
    longSMA: s.longSMA,
    bbUpper: s.bbUpper,
    bbLower: s.bbLower,
    bbMiddle: s.bbMiddle,
    rsi: s.rsi,
    type: s.type,
    confidence: s.confidence,
  }))

  const buySignals = chartData.filter(d => d.type === SIGNAL_BUY)
  const sellSignals = chartData.filter(d => d.type === SIGNAL_SELL)

  return (
    <div className="space-y-4">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.blue} stopOpacity={0.28} />
                <stop offset="100%" stopColor={p.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={p.grid} strokeDasharray="2 4" />
            <XAxis dataKey="date" stroke={p.axis} {...axis} tickFormatter={v => v.slice(5)} minTickGap={24} />
            <YAxis stroke={p.axis} {...axis} width={56} domain={['auto', 'auto']} tickFormatter={v => v.toFixed(3)} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: p.text, fontWeight: 600 }}
              cursor={{ stroke: p.axis, strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                if (value == null) return ['—', name]
                const labels = {
                  rate: 'Rate',
                  shortSMA: 'SMA(7)',
                  longSMA: 'SMA(25)',
                  bbUpper: 'BB Upper',
                  bbLower: 'BB Lower',
                  bbMiddle: 'BB Middle',
                }
                return [parseFloat(value).toFixed(4), labels[name] || name]
              }}
            />
            <Line dataKey="bbUpper" stroke={p.axis} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="bbLower" stroke={p.axis} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
            <Area dataKey="rate" stroke={p.blue} strokeWidth={2.2} fill="url(#priceFill)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: p.card }} animationDuration={900} />
            <Line dataKey="shortSMA" stroke={p.orange} strokeWidth={1.5} dot={false} connectNulls animationDuration={900} />
            <Line dataKey="longSMA" stroke={p.purple} strokeWidth={1.5} dot={false} connectNulls animationDuration={900} />
            {buySignals.map((d, i) => (
              <ReferenceDot key={`buy-${i}`} x={d.date} y={d.rate} r={5} fill={p.green} stroke={p.card} strokeWidth={2} />
            ))}
            {sellSignals.map((d, i) => (
              <ReferenceDot key={`sell-${i}`} x={d.date} y={d.rate} r={5} fill={p.red} stroke={p.card} strokeWidth={2} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="h-32">
        <div className="eyebrow mb-1">RSI (14)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={p.grid} strokeDasharray="2 4" />
            <XAxis dataKey="date" stroke={p.axis} {...axis} fontSize={10} tickFormatter={v => v.slice(5)} minTickGap={24} />
            <YAxis domain={[0, 100]} ticks={[30, 70]} stroke={p.axis} {...axis} fontSize={10} width={56} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => v != null ? [v.toFixed(1), 'RSI'] : ['—', 'RSI']}
            />
            <Line dataKey="rsi" stroke={p.cyan} strokeWidth={1.5} dot={false} connectNulls animationDuration={900} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {[['Rate', p.blue], ['SMA(7)', p.orange], ['SMA(25)', p.purple], ['Bollinger Bands', p.axis, true]].map(([label, color, dashed]) => (
          <span key={label} className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 rounded-full" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)` : color }} /> {label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.green }} /> Buy Signal</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.red }} /> Sell Signal</span>
      </div>

      {intradayData && intradayData.length > 1 && (
        <div className="space-y-2">
          <div className="eyebrow">Intraday (5-min intervals)</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intradayData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={p.grid} strokeDasharray="2 4" />
                <XAxis dataKey="date" stroke={p.axis} {...axis} fontSize={10} minTickGap={24} />
                <YAxis stroke={p.axis} {...axis} fontSize={10} width={56} domain={['auto', 'auto']} tickFormatter={v => v.toFixed(3)} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => v != null ? [v.toFixed(4), 'Price'] : ['\u2014', 'Price']}
                />
                <Line dataKey="rate" stroke={p.blue} strokeWidth={1.5} dot={false} animationDuration={900} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
