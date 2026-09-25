import { proxyGet, proxyOptions } from './proxy.js'
import { holdings } from './lengs.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/proxy') {
      if (request.method === 'OPTIONS') return proxyOptions()
      if (request.method === 'GET') return proxyGet(request)
      return new Response('Method not allowed', { status: 405 })
    }
    if (url.pathname === '/api/holdings' && request.method === 'GET') {
      try {
        return await holdings(env)
      } catch (err) {
        return Response.json({ error: `Could not reach Lengs Funding: ${err.message}` }, { status: 502 })
      }
    }
    return env.ASSETS.fetch(request)
  },
}
