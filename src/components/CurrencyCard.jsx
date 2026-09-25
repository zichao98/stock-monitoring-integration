import AssetCard from './AssetCard.jsx'

export default function CurrencyCard({ pair, currentRate, ...rest }) {
  return (
    <AssetCard
      title={`${pair.base} / ${pair.target}`}
      tag="FX"
      subtitle={pair.label}
      footnote={`1 ${pair.base} = ${currentRate?.toFixed(4) || '---'} ${pair.target}`}
      value={currentRate}
      decimals={4}
      {...rest}
    />
  )
}
