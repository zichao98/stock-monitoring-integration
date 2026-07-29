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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Alert Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
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
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Save Alerts
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
