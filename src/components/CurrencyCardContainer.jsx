import { useMemo } from 'react'
import { useRateData } from '../hooks/useRateData.js'
import { computeSignals } from '../lib/signals.js'
import CurrencyCard from './CurrencyCard.jsx'

export default function CurrencyCardContainer({ pair, config, alerts, onToggleAlert, onSelect, onRemove, isActive, index }) {
  const { history, currentRate, loading } = useRateData(pair, config.pollingInterval)

  const { current: signal } = useMemo(() => {
    return computeSignals(history, config)
  }, [history, config])

  return (
    <CurrencyCard
      pair={pair}
      currentRate={currentRate}
      history={history}
      signal={signal}
      alerts={alerts}
      onToggleAlert={onToggleAlert}
      onSelect={onSelect}
      onRemove={onRemove}
      isActive={isActive}
      index={index}
    />
  )
}
