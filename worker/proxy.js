// Same-origin CORS proxy for Yahoo Finance, served by the Worker in index.js.
// Server-side fetch is not subject to browser CORS, and Cloudflare's egress
// IPs are not blocked by the public CORS proxies that the client falls back to.
//
// Route: /api/proxy?url=<absolute Yahoo Finance URL>
// Allowed hosts are limited to Yahoo Finance to avoid an open proxy.

const ALLOWED_HOSTS = new Set([
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

export function proxyOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function proxyGet(request) {
  const url = new URL(request.url)
  const target = url.searchParams.get('url')
  if (!target) return json(400, { error: 'Missing url parameter' })

  let targetUrl
  try {
    targetUrl = new URL(target)
  } catch {
    return json(400, { error: 'Invalid url parameter' })
  }

  if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return json(403, { error: 'Host not allowed' })
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockMonitor/1.0)',
        'Accept': 'application/json,text/plain,*/*',
      },
      cf: { cacheTtl: 30, cacheEverything: true },
    })

    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'public, max-age=30',
        ...CORS_HEADERS,
      },
    })
  } catch (err) {
    return json(502, { error: 'Upstream fetch failed', detail: err.message })
  }
}
