import { config } from '#src/config/config.js'

const MILLISECONDS_PER_SECOND = 1000
// Renew a minute early so a token can't expire in flight.
const EXPIRY_SKEW_MS = 60_000
const DEFAULT_EXPIRES_IN_SECONDS = 3600

let cachedToken = null

export const resetTokenCache = () => {
  cachedToken = null
}

const buildTokenRequestBody = () => {
  const { clientId, clientSecret, clientScope, redirectUri } =
    config.get('addressLookup')

  return new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    scope: clientScope,
    grant_type: 'client_credentials'
  }).toString()
}

const requestNewToken = async (request, signal) => {
  const { oauthTokenUrl } = config.get('addressLookup')

  const response = await fetch(oauthTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildTokenRequestBody(),
    signal
  })

  if (!response.ok) {
    request.logger.error(
      { statusCode: response.status },
      'Address lookup token request failed'
    )
    return null
  }

  const data = await response.json()

  if (!data?.access_token) {
    request.logger.error(
      { statusCode: response.status },
      'Address lookup token response did not contain an access token'
    )
    return null
  }

  const expiresInSeconds = Number(data.expires_in) || DEFAULT_EXPIRES_IN_SECONDS

  cachedToken = {
    token: data.access_token,
    expiresAt:
      Date.now() + expiresInSeconds * MILLISECONDS_PER_SECOND - EXPIRY_SKEW_MS
  }

  return cachedToken.token
}

export const getAccessToken = async (
  request,
  { forceRefresh = false, signal } = {}
) => {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  cachedToken = null

  try {
    return await requestNewToken(request, signal)
  } catch (error) {
    request.logger.error(error, 'Address lookup token request threw an error')
    return null
  }
}
