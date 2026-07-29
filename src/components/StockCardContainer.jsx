import { useMemo } from 'react'
import { useStockData } from '../hooks/useStockData.js'
import { computeSignals } from '../lib/signals.js'
import StockCard from './StockCard.jsx'

export default function StockCardContainer({ stock, config, alerts, onToggleAlert, onSelect, isActive }) {
  const { history, currentPrice, loading } = useStockData(stock, config.pollingInterval)

  const { current: signal } = useMemo(() => {
    return computeSignals(history, config)
  }, [history, config])

  return (
    <StockCard
      stock={stock}
      currentPrice={currentPrice}
      history={history}
      signal={signal}
      alerts={alerts}
      onToggleAlert={onToggleAlert}
      onSelect={onSelect}
      isActive={isActive}
    />
  )
}
