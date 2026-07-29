import { sma, rsi, bollingerBands } from './indicators.js'

export const SIGNAL_BUY = 'BUY'
export const SIGNAL_SELL = 'SELL'
export const SIGNAL_HOLD = 'HOLD'

export function computeSignals(history, config = {}) {
  const {
    shortPeriod = 7,
    longPeriod = 25,
    rsiPeriod = 14,
    bbPeriod = 20,
    bbStdDev = 2,
    rsiOversold = 30,
    rsiOverbought = 70,
  } = config

  if (!history || history.length < longPeriod + 1) {
    return {
      signals: [],
      current: null,
      indicators: null,
    }
  }

  const rates = history.map(h => h.rate)
  const shortSMA = sma(rates, shortPeriod)
  const longSMA = sma(rates, longPeriod)
  const rsiValues = rsi(rates, rsiPeriod)
  const bb = bollingerBands(rates, bbPeriod, bbStdDev)

  const signals = []

  for (let i = 0; i < history.length; i++) {
    let score = 0
    const reasons = []

    if (shortSMA[i] != null && longSMA[i] != null) {
      if (shortSMA[i] > longSMA[i]) {
        score += 1
        reasons.push('Short SMA above Long SMA (bullish trend)')
      } else {
        score -= 1
        reasons.push('Short SMA below Long SMA (bearish trend)')
      }

      if (i > 0 && shortSMA[i - 1] != null && longSMA[i - 1] != null) {
        if (shortSMA[i - 1] <= longSMA[i - 1] && shortSMA[i] > longSMA[i]) {
          score += 1
          reasons.push('Golden cross detected (strong buy)')
        } else if (shortSMA[i - 1] >= longSMA[i - 1] && shortSMA[i] < longSMA[i]) {
          score -= 1
          reasons.push('Death cross detected (strong sell)')
        }
      }
    }

    if (rsiValues[i] != null) {
      if (rsiValues[i] < rsiOversold) {
        score += 1
        reasons.push(`RSI ${rsiValues[i].toFixed(1)} (oversold — buy zone)`)
      } else if (rsiValues[i] > rsiOverbought) {
        score -= 1
        reasons.push(`RSI ${rsiValues[i].toFixed(1)} (overbought — sell zone)`)
      } else {
        reasons.push(`RSI ${rsiValues[i].toFixed(1)} (neutral)`)
      }
    }

    if (bb.upper[i] != null && bb.lower[i] != null) {
      if (rates[i] <= bb.lower[i]) {
        score += 1
        reasons.push('Price at lower Bollinger Band (oversold)')
      } else if (rates[i] >= bb.upper[i]) {
        score -= 1
        reasons.push('Price at upper Bollinger Band (overbought)')
      }
    }

    let type = SIGNAL_HOLD
    if (score >= 2) type = SIGNAL_BUY
    else if (score <= -2) type = SIGNAL_SELL

    const confidence = Math.min(Math.abs(score) / 4, 1) * 100

    signals.push({
      date: history[i].date,
      timestamp: history[i].timestamp,
      rate: rates[i],
      type,
      score,
      confidence,
      reasons,
      shortSMA: shortSMA[i],
      longSMA: longSMA[i],
      rsi: rsiValues[i],
      bbUpper: bb.upper[i],
      bbMiddle: bb.middle[i],
      bbLower: bb.lower[i],
    })
  }

  const current = signals[signals.length - 1]

  return {
    signals,
    current,
    indicators: { shortSMA, longSMA, rsiValues, bb },
  }
}

export function formatSignal(signal) {
  if (!signal) return { label: 'No Data', color: 'text-muted-foreground', bg: 'bg-muted' }
  switch (signal.type) {
    case SIGNAL_BUY:
      return { label: 'BUY', color: 'text-green-400', bg: 'bg-green-500/15' }
    case SIGNAL_SELL:
      return { label: 'SELL', color: 'text-red-400', bg: 'bg-red-500/15' }
    default:
      return { label: 'HOLD', color: 'text-yellow-400', bg: 'bg-yellow-500/15' }
  }
}
