const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function getAIInsight(apiKey, context) {
  if (!apiKey) {
    throw new Error('Please set your Gemini API key in Settings.')
  }

  const { pair, currentRate, signals, history, assetType = 'forex' } = context

  const recentSignals = signals.slice(-5).map(s => ({
    date: s.date,
    rate: s.rate,
    signal: s.type,
    confidence: s.confidence.toFixed(0) + '%',
    rsi: s.rsi?.toFixed(1),
    reasons: s.reasons,
  }))

  const recentRates = history.slice(-10).map(h => ({
    date: h.date,
    rate: h.rate,
  }))

  const assetLabel = assetType === 'stock' ? 'Stock' : 'Currency Pair'
  const roleLabel = assetType === 'stock'
    ? 'a professional stock trading assistant'
    : 'a professional forex trading assistant'
  const rateLabel = assetType === 'stock' ? 'Current Price' : 'Current Rate'

  const prompt = `You are ${roleLabel}. Analyze the following ${assetType === 'stock' ? 'stock' : 'currency exchange'} data and provide intuitive, actionable insights.

${assetLabel}: ${pair}
${rateLabel}: ${currentRate}

Recent Price History (last 10 days):
${JSON.stringify(recentRates, null, 2)}

Recent Trading Signals (last 5 days):
${JSON.stringify(recentSignals, null, 2)}

Please provide:
1. **Market Summary**: A brief 2-3 sentence overview of the current trend.
2. **Recommended Action**: Should the user BUY, SELL, or HOLD? Explain why in simple terms.
3. **Risk Note**: One sentence about potential risks or what to watch for.

Keep it concise and easy to understand for a non-expert. Use plain language.`

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `HTTP ${res.status}`
    throw new Error(`Gemini API error: ${msg}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini API')
  return text
}
