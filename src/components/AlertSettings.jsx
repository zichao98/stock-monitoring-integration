import { useState } from 'react'
import { cn } from '../lib/utils.js'
import { Target, X } from 'lucide-react'

export default function AlertSettings({ item, alerts, onSave, onClose }) {
  const [buyTarget, setBuyTarget] = useState(alerts?.buyTarget?.toString() || '')
  const [sellTarget, setSellTarget] = useState(alerts?.sellTarget?.toString() || '')

  const handleSave = () => {
    onSave({
      buyTarget: buyTarget ? parseFloat(buyTarget) : null,
      sellTarget: sellTarget ? parseFloat(sellTarget) : null,
    })
    onClose()
  }

  const displayLabel = item.displayLabel || `${item.base}/${item.target}`

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-md sheet panel p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Alert Settings</h2>
          </div>
          <button onClick={onClose} className="round-button" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Set target {item.assetType === 'stock' ? 'prices' : 'rates'} for <span className="font-semibold text-foreground">{displayLabel}</span>. You'll be notified when the {item.assetType === 'stock' ? 'price' : 'rate'} hits your targets.
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Buy Target (buy when {item.assetType === 'stock' ? 'price' : 'rate'} drops to or below)
            </label>
            <input
              type="number"
              step="0.01"
              value={buyTarget}
              onChange={e => setBuyTarget(e.target.value)}
              placeholder={item.assetType === 'stock' ? 'e.g. 150.00' : 'e.g. 6.50'}
              className="w-full px-3 py-2 rounded-lg bg-muted/70 border border-transparent text-foreground focus:outline-none focus:bg-card focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Sell Target (sell when {item.assetType === 'stock' ? 'price' : 'rate'} rises to or above)
            </label>
            <input
              type="number"
              step="0.01"
              value={sellTarget}
              onChange={e => setSellTarget(e.target.value)}
              placeholder={item.assetType === 'stock' ? 'e.g. 200.00' : 'e.g. 7.20'}
              className="w-full px-3 py-2 rounded-lg bg-muted/70 border border-transparent text-foreground focus:outline-none focus:bg-card focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold shadow-[0_6px_16px_hsl(var(--primary)/.3)] hover:brightness-110 active:scale-95 transition"
          >
            Save Alerts
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-muted text-foreground font-semibold hover:bg-input active:scale-95 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
