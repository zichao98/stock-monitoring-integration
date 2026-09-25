// Holdings synced from the Lengs Funding app (its /api/book is public, read-only).
// Lengs Funding stores symbols as typed by hand ("臺積電", "Maybank", "0050"),
// so map them to Yahoo symbols here. Keep in step with lengs-funding's
// src/instruments.ts and worker/market.js.

const LENGS_BOOK_URL = 'https://lengs-funding.zichaoleng55.workers.dev/api/book'

// Yahoo symbol → [display code, name, market]
const CATALOG = {
  '0050.TW': ['0050', '元大台灣50', 'TW'],
  '0056.TW': ['0056', '元大高股息', 'TW'],
  '006208.TW': ['006208', '富邦台50', 'TW'],
  '00646.TW': ['00646', '元大S&P500', 'TW'],
  '00679B.TWO': ['00679B', '元大美債20年', 'TW'],
  '00878.TW': ['00878', '國泰永續高股息', 'TW'],
  '2303.TW': ['2303', '聯電', 'TW'],
  '2330.TW': ['2330', '台積電', 'TW'],
  '8299.TWO': ['8299', '群聯', 'TW'],
  '6742.KL': ['6742', 'YTL Power', 'MY'],
  '1155.KL': ['1155', 'Maybank', 'MY'],
  '0820EA.KL': ['0820EA', 'FTSE4Good Bursa Malaysia ETF', 'MY'],
  '6742UW': ['6742UW', 'YTL Power (bonus warrant)', 'MY'],
  INTC: ['INTC', 'Intel', 'US'],
  MU: ['MU', 'Micron', 'US'],
  SPCX: ['SPCX', 'Tuttle Capital SpaceX ETF', 'US'],
  VOO: ['VOO', 'Vanguard S&P 500 ETF', 'US'],
}

const ALIASES = {
  '聯電': '2303.TW', '2303': '2303.TW', '臺積電': '2330.TW', '台積電': '2330.TW', '2330': '2330.TW',
  '8299': '8299.TWO', '群聯': '8299.TWO', '00679B': '00679B.TWO',
  YTLPOWER: '6742.KL', '6742': '6742.KL', MAYBANK: '1155.KL', '1155': '1155.KL', '0820EA': '0820EA.KL',
  'YTLPOWR-UW': '6742UW', MICRON: 'MU', '美光': 'MU', INTEL: 'INTC',
}

const MARKET_BY_CURRENCY = { TWD: 'TW', MYR: 'MY', USD: 'US' }

export function toYahoo(raw) {
  const s = String(raw || '').trim()
  const upper = s.toUpperCase()
  if (ALIASES[s] || ALIASES[upper]) return ALIASES[s] || ALIASES[upper]
  if (CATALOG[upper]) return upper
  if (/^\d{4,6}[A-Z]?$/.test(upper)) return `${upper}.TW`
  return upper
}

export function normaliseBook(book) {
  const merged = new Map()
  for (const p of book?.positions || []) {
    if (!(p.quantity > 0)) continue
    const symbol = toYahoo(p.symbol)
    const [code, name, market] = CATALOG[symbol] || [symbol.replace(/\.(TWO?|KL)$/, ''), symbol, MARKET_BY_CURRENCY[p.currency] || 'US']
    const row = merged.get(symbol) || { id: symbol, symbol, code, name, market, currency: p.currency, quantity: 0, cost: 0 }
    row.quantity += Number(p.quantity) || 0
    row.cost += Number(p.cost) || 0
    merged.set(symbol, row)
  }
  return [...merged.values()]
}

export async function holdings(env) {
  // Prefer the service binding (worker-to-worker, no public round trip);
  // fall back to the public URL for local dev without the binding.
  let res
  try {
    res = env.LENGS ? await env.LENGS.fetch(new Request(LENGS_BOOK_URL)) : null
  } catch {
    res = null
  }
  if (!res || !res.ok) res = await fetch(LENGS_BOOK_URL)
  if (!res.ok) return Response.json({ error: `Lengs Funding responded ${res.status}` }, { status: 502 })
  const data = await res.json()
  return Response.json(
    { holdings: normaliseBook(data.book), updatedAt: data.updatedAt || null, source: 'Lengs Funding' },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
