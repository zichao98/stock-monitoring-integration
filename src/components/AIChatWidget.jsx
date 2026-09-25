import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Sparkles, X, Send, Loader2, KeyRound, Trash2 } from 'lucide-react'
import { chatWithAI } from '../lib/ai.js'
import { cn } from '../lib/utils.js'

export default function AIChatWidget({ apiKey, onOpenSettings }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    if (!apiKey) {
      setError('Please set your OpenRouter API key in Settings first.')
      return
    }

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const reply = await chatWithAI(apiKey, newMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setMessages([])
    setError(null)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ease-[cubic-bezier(.2,.9,.25,1.15)]',
          'bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white shadow-[0_10px_30px_rgb(10_132_255/.4)] hover:scale-105 active:scale-95',
          open && 'rotate-90'
        )}
        title="Discuss with AI"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[480px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] panel sheet flex flex-col overflow-hidden origin-bottom-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/15">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Powered by OpenRouter</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Sparkles className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Ask me about market trends, trading strategy, or your portfolio.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'max-w-[85%] bg-primary text-primary-foreground'
                      : 'max-w-[95%] bg-muted text-foreground'
                  )}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-pre:overflow-x-auto">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto">
                              <table {...props} />
                            </div>
                          ),
                        }}
                      >{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* No API Key */}
          {!apiKey && (
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <KeyRound className="w-3 h-3" />
                Set your OpenRouter API key to start chatting
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-2 text-xs text-red-400 border-t border-border bg-red-500/5">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/70 border border-transparent text-foreground focus:outline-none focus:bg-card focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition text-sm resize-none"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={cn(
                'p-2 rounded-lg bg-primary text-primary-foreground transition-colors flex-shrink-0',
                (loading || !input.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
