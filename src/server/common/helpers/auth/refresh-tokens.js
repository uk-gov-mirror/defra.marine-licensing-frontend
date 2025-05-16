import fetch from 'node-fetch'
import { config } from '~/src/config/config.js'

export async function refreshTokens(refreshToken) {
  const discovery = config.get('defraIdOidcConfigurationUrl')
  let issuer = discovery.replace(/\.well-known\/.+$/, '')
  issuer = issuer.replace(/\/+$/, '')
  const tokenEndpoint = `${issuer}/token`

  // const tokenEndpoint =
  //   config.get('defraIdOidcConfigurationUrl').replace(/\.well-known\/.+$/, '') +
  //   '/token'

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
