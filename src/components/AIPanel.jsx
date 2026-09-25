import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { getAIInsight } from '../lib/ai.js'
import { Sparkles, RefreshCw, AlertCircle, KeyRound } from 'lucide-react'
import { cn } from '../lib/utils.js'

export default function AIPanel({ pair, currentRate, signals, history, apiKey, onOpenSettings, assetType = 'forex' }) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('Please set your OpenRouter API key in Settings first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const text = await getAIInsight(apiKey, {
        pair: assetType === 'stock'
          ? `${pair.symbol} (${pair.label})`
          : `${pair.base}/${pair.target}`,
        currentRate,
        signals,
        history,
        assetType,
      })
      setInsight(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">AI Market Insights</h3>
            <p className="text-xs text-muted-foreground">Powered by OpenRouter</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            'bg-primary/15 text-primary hover:bg-primary/25',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {loading ? 'Analyzing...' : insight ? 'Refresh' : 'Generate'}
        </button>
      </div>

      {!apiKey && !insight && !error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <KeyRound className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">No API key set</p>
          <button
            onClick={onOpenSettings}
            className="text-sm text-primary hover:underline"
          >
            Click here to set your OpenRouter API key →
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !insight && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      )}

      {insight && (
        <div className="prose dark:prose-invert prose-sm max-w-none text-sm leading-relaxed text-foreground/90 prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{insight}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
