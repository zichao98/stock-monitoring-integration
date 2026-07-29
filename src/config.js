export const CURRENCY_PAIRS = [
  { id: 'MYR-TWD', base: 'MYR', target: 'TWD', label: 'Malaysia Ringgit → Taiwan Dollar' },
  { id: 'MYR-USD', base: 'MYR', target: 'USD', label: 'Malaysia Ringgit → US Dollar' },
]

export const TAIWAN_STOCKS = [
  { id: 'TW-0050', symbol: '0050', yahooSymbol: '0050.TW', label: '元大台灣50 ETF', market: 'TW' },
  { id: 'TW-006208', symbol: '006208', yahooSymbol: '006208.TW', label: '富邦台50 ETF', market: 'TW' },
  { id: 'TW-0056', symbol: '0056', yahooSymbol: '0056.TW', label: '元大高股息 ETF', market: 'TW' },
  { id: 'TW-00646', symbol: '00646', yahooSymbol: '00646.TW', label: '元大台灣50反1 ETF', market: 'TW' },
  { id: 'TW-00878', symbol: '00878', yahooSymbol: '00878.TW', label: '國泰永續高股息 ETF', market: 'TW' },
  { id: 'TW-2303', symbol: '2303', yahooSymbol: '2303.TW', label: '聯華電子', market: 'TW' },
  { id: 'TW-2330', symbol: '2330', yahooSymbol: '2330.TW', label: '台灣積體電路 (TSMC)', market: 'TW' },
]

export const US_STOCKS = [
  { id: 'US-SPCX', symbol: 'SPCX', yahooSymbol: 'SPCX', label: 'SPCX (SpaceX-related)', market: 'US' },
]

export const ALL_STOCKS = [...TAIWAN_STOCKS, ...US_STOCKS]

export const DEFAULT_CONFIG = {
  shortPeriod: 7,
  longPeriod: 25,
  rsiPeriod: 14,
  bbPeriod: 20,
  bbStdDev: 2,
  rsiOversold: 30,
  rsiOverbought: 70,
  pollingInterval: 60,
}
