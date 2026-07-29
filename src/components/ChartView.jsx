import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, LineChart } from 'recharts'
import { SIGNAL_BUY, SIGNAL_SELL } from '../lib/signals.js'

const tooltipStyle = {
  backgroundColor: 'hsl(222 47% 14%)',
  border: '1px solid hsl(217 33% 22%)',
  borderRadius: '8px',
  fontSize: '12px',
}

export default function ChartView({ signals, pair }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading chart data...
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
              <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215 20% 65%)"
              fontSize={11}
              tickFormatter={v => v.slice(5)}
            />
            <YAxis
              stroke="hsl(215 20% 65%)"
              fontSize={11}
              domain={['auto', 'auto']}
              tickFormatter={v => v.toFixed(3)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'hsl(213 31% 91%)' }}
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
            <Area
              dataKey="bbUpper"
              stroke="none"
              fill="url(#bbGradient)"
              connectNulls
            />
            <Area
              dataKey="bbLower"
              stroke="none"
              fill="hsl(222 47% 14%)"
              connectNulls
            />
            <Line dataKey="bbUpper" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />
            <Line dataKey="bbLower" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />
            <Line dataKey="rate" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line dataKey="shortSMA" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
            <Line dataKey="longSMA" stroke="#a855f7" strokeWidth={1.5} dot={false} connectNulls />
            {buySignals.map((d, i) => (
              <ReferenceDot
                key={`buy-${i}`}
                x={d.date}
                y={d.rate}
                r={6}
                fill="#22c55e"
                stroke="#16a34a"
                strokeWidth={2}
              />
            ))}
            {sellSignals.map((d, i) => (
              <ReferenceDot
                key={`sell-${i}`}
                x={d.date}
                y={d.rate}
                r={6}
                fill="#ef4444"
                stroke="#dc2626"
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="h-32">
        <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" stroke="hsl(215 20% 65%)" fontSize={10} tickFormatter={v => v.slice(5)} />
            <YAxis domain={[0, 100]} stroke="hsl(215 20% 65%)" fontSize={10} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => v != null ? [v.toFixed(1), 'RSI'] : ['—', 'RSI']}
            />
            <Line dataKey="rsi" stroke="#06b6d4" strokeWidth={1.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#22c55e]" /> Rate</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#f59e0b]" /> SMA(7)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#a855f7]" /> SMA(25)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#3b82f6] border-dashed" /> Bollinger Bands</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Buy Signal</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Sell Signal</span>
      </div>
    </div>
  )
}
