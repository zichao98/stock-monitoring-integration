import { useState } from 'react'
import { X, KeyRound, Settings as SettingsIcon, ExternalLink } from 'lucide-react'
import { DEFAULT_CONFIG } from '../config.js'

export default function SettingsModal({ config, apiKey, onSave, onClose }) {
  const [localConfig, setLocalConfig] = useState(config)
  const [localApiKey, setLocalApiKey] = useState(apiKey)

  const update = (key, value) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(localConfig, localApiKey)
    onClose()
  }

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Gemini API Key</h3>
            </div>
            <input
              type="password"
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder="Enter your Google Gemini API key"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
            >
              Get a free API key from Google AI Studio
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-sm mb-3">Indicator Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Short SMA Period" value={localConfig.shortPeriod} onChange={v => update('shortPeriod', v)} />
              <NumberInput label="Long SMA Period" value={localConfig.longPeriod} onChange={v => update('longPeriod', v)} />
              <NumberInput label="RSI Period" value={localConfig.rsiPeriod} onChange={v => update('rsiPeriod', v)} />
              <NumberInput label="RSI Oversold" value={localConfig.rsiOversold} onChange={v => update('rsiOversold', v)} />
              <NumberInput label="RSI Overbought" value={localConfig.rsiOverbought} onChange={v => update('rsiOverbought', v)} />
              <NumberInput label="BB Period" value={localConfig.bbPeriod} onChange={v => update('bbPeriod', v)} />
              <NumberInput label="BB Std Dev" value={localConfig.bbStdDev} onChange={v => update('bbStdDev', v)} step="0.1" />
              <NumberInput label="Polling (seconds)" value={localConfig.pollingInterval} onChange={v => update('pollingInterval', v)} />
            </div>
          </div>

          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset to defaults
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberInput({ label, value, onChange, step = '1' }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
      />
    </div>
  )
}
