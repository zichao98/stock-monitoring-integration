import { proxyGet, proxyOptions } from './proxy.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/proxy') {
      if (request.method === 'OPTIONS') return proxyOptions()
      if (request.method === 'GET') return proxyGet(request)
      return new Response('Method not allowed', { status: 405 })
    }
    return env.ASSETS.fetch(request)
  },
}
