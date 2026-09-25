import AssetCard from './AssetCard.jsx'

export default function StockCard({ stock, currentPrice, ...rest }) {
  return (
    <AssetCard
      title={stock.symbol}
      tag={{ TW: 'TWSE', MY: 'Bursa' }[stock.market] || 'US'}
      subtitle={stock.label}
      footnote={`${stock.yahooSymbol || stock.symbol} @ ${currentPrice?.toFixed(2) || '---'}`}
      value={currentPrice}
      decimals={2}
      {...rest}
    />
  )
}
