import Wreck from '@hapi/wreck'
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

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.get('defraIdClientId'),
    client_secret: config.get('defraIdClientSecret'),
    refresh_token: refreshToken
  }).toString()

  const { res, payload } = await Wreck.post(tokenEndpoint, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    payload: body
  })

  if (res.statusCode >= 400) {
    throw new Error(`refresh failed: ${res.statusCode}`)
  }

  return JSON.parse(payload.toString())
}
