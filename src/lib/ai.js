const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free model availability on OpenRouter changes frequently, so try several in order.
const FALLBACK_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen/qwen3-coder:free',
  'deepseek/deepseek-r1:free',
  'openrouter/free',
]

async function callOpenRouter(apiKey, messages, maxTokens = 500) {
  const key = (apiKey || '').trim()
  if (!key) {
    throw new Error('Please set your OpenRouter API key in Settings.')
  }

  let lastError = null

  for (const model of FALLBACK_MODELS) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.error?.message || `HTTP ${res.status}`
        // Retry with next model on "no endpoints" / rate-limit / not-found errors
        if (res.status === 404 || res.status === 429 || /no endpoints/i.test(msg)) {
          lastError = new Error(`${model}: ${msg}`)
          continue
        }
        throw new Error(`OpenRouter API error: ${msg}`)
      }

      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) {
        lastError = new Error(`${model}: No response content`)
        continue
      }
      return text
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(`OpenRouter API error: all free models unavailable. ${lastError?.message || ''}`)
}

export async function getAIInsight(apiKey, context) {
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

  return callOpenRouter(apiKey, [{ role: 'user', content: prompt }], 500)
}

export async function getPortfolioInsight(apiKey, portfolioData, totalCost, totalValue, totalPnl, question = '') {
  const prompt = `You are a professional portfolio advisor. Analyze the following portfolio and provide strategic advice.

Portfolio Summary:
- Total Cost Basis: ${totalCost.toFixed(2)}
- Current Market Value: ${totalValue.toFixed(2)}
- Total P&L: ${totalPnl.toFixed(2)} (${totalCost > 0 ? (totalPnl / totalCost * 100).toFixed(2) : 0}%)

Holdings:
${JSON.stringify(portfolioData, null, 2)}

${question ? `User question: ${question}` : 'Please provide a general portfolio review.'}

Please provide:
1. **Portfolio Overview**: Brief assessment of the overall portfolio health and diversification.
2. **Holding Analysis**: For each holding, comment on its performance and whether to hold, reduce, or add.
3. **Risk Assessment**: Key risks in the current portfolio and concentration issues.
4. **Strategic Recommendations**: Specific actionable next steps (e.g. rebalancing, new positions to consider, exit signals).
5. **Market Timing**: Any timing considerations given current market conditions.

Keep it practical and easy to understand. Use plain language.`

  return callOpenRouter(apiKey, [{ role: 'user', content: prompt }], 1000)
}

export async function chatWithAI(apiKey, messages) {
  const systemMessage = {
    role: 'system',
    content: 'You are a helpful financial markets assistant integrated into a stock and forex monitoring app. Help the user discuss trading strategy, market analysis, and their portfolio. Keep answers concise, practical, and easy to understand. Use markdown formatting (bold, lists) where helpful.',
  }
  return callOpenRouter(apiKey, [systemMessage, ...messages], 800)
}
