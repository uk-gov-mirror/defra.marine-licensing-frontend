import Wreck from '@hapi/wreck'
import querystring from 'node:querystring'
import { config } from '#src/config/config.js'
import { getUpstreamStatusCode } from '#src/server/common/helpers/marine-licence/invoicing/address-lookup-errors.js'

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

  return querystring.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    scope: clientScope,
    grant_type: 'client_credentials'
  })
}

const requestNewToken = async (request, timeout) => {
  const { oauthTokenUrl } = config.get('addressLookup')

  const response = await Wreck.post(oauthTokenUrl, {
    payload: buildTokenRequestBody(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout
  })

  const statusCode = response.res?.statusCode
  // Parsed by hand rather than with json: true, so a token endpoint that omits
  // or mislabels its content-type still yields a token.
  const data = JSON.parse(response.payload.toString('utf8'))

  if (!data?.access_token) {
    request.logger.error(
      { statusCode },
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
  { forceRefresh = false, timeout } = {}
) => {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  cachedToken = null

  try {
    return await requestNewToken(request, timeout)
  } catch (error) {
    const statusCode = getUpstreamStatusCode(error)

    if (statusCode) {
      request.logger.error(
        { statusCode },
        'Address lookup token request failed'
      )
      return null
    }

    request.logger.error(error, 'Address lookup token request threw an error')
    return null
  }
}
