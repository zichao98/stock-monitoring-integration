export function sma(values, period) {
  const result = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        sum += values[j]
      }
      result.push(sum / period)
    }
  }
  return result
}

export function rsi(values, period = 14) {
  const result = []
  if (values.length < period + 1) {
    return values.map(() => null)
  }

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1]
    if (change >= 0) gains += change
    else losses -= change
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = 0; i < period; i++) {
    result.push(null)
  }

  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    const gain = change >= 0 ? change : 0
    const loss = change < 0 ? -change : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  }

  return result
}

export function bollingerBands(values, period = 20, stdDev = 2) {
  const upper = []
  const middle = []
  const lower = []

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      upper.push(null)
      middle.push(null)
      lower.push(null)
    } else {
      const slice = values.slice(i - period + 1, i + 1)
      const mean = slice.reduce((a, b) => a + b, 0) / period
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
      const sd = Math.sqrt(variance)

      middle.push(mean)
      upper.push(mean + stdDev * sd)
      lower.push(mean - stdDev * sd)
    }
  }

  return { upper, middle, lower }
}

export function percentChange(current, previous) {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}
