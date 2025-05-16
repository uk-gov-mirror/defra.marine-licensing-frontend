import fetch from 'node-fetch'
import { config } from '~/src/config/config.js'

export async function refreshTokens(refreshToken) {
  let issuer = config.get('defraIdOidcConfigurationUrl')
  const idx = issuer.indexOf('/.well-known/')
  if (idx !== -1) {
    issuer = issuer.slice(0, idx)
  }
  while (issuer.endsWith('/')) {
    issuer = issuer.slice(0, -1)
  }
  const tokenEndpoint = issuer + '/token'

  const resp = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.get('defraIdClientId'),
      client_secret: config.get('defraIdClientSecret'),
      refresh_token: refreshToken
    })
  })

  if (!resp.ok) {
    throw new Error(`refresh failed: ${resp.status}`)
  }

  return resp.json()
}
