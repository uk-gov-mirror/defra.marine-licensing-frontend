import { config } from '~/src/config/config.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { getOpenIdRefreshToken } from './get-oidc-config.js'
import jwt from '@hapi/jwt'
import { addSeconds } from 'date-fns'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const getUserSession = async (request, session) => {
  if (session?.sessionId) {
    const userSession = await request.server.app.cache.get(session.sessionId)
    return userSession
  }

  return null
}

export const removeUserSession = (request, session) => {
  request.server.app.cache.drop(session.sessionId)
  request.cookieAuth.clear()
}

export const refreshAccessToken = async (request, session) => {
  const authedUser = await getUserSession(request, session)
  request.logger.setBindings({ refreshingAccessToken: authedUser.strategy })

  const authConfig = config.get('defraId')
  const { clientId, clientSecret, scopes, redirectUrl } = authConfig

  const refreshToken = authedUser?.refreshToken ?? null
  const redirectUri = `${redirectUrl}${routes.AUTH_DEFRA_ID_CALLBACK}`

  const params = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: scopes,
    redirect_uri: redirectUri
  }

  return getOpenIdRefreshToken(authedUser.tokenUrl, params)
}

export const updateUserSession = async (request, refreshedSession) => {
  const payload = jwt.token.decode(refreshedSession.access_token).decoded
    .payload

  const logger = createLogger()
  logger.info(
    `DEFRA ID LOG (updateUserSession): payload ${JSON.stringify(payload)}`
  )

  const expiresInSeconds = refreshedSession.expires_in
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds)

  const authedUser = await getUserSession(request, request.state.session)
  logger.info(
    `DEFRA ID LOG (updateUserSession): authedUser ${JSON.stringify(authedUser)}`
  )

  const displayName = [payload.firstName, payload.lastName]
    .filter((part) => part)
    .join(' ')

  await request.server.app.cache.set(
    request.state.session.sessionId,
    {
      ...authedUser,
      id: payload.sub,
      correlationId: payload.correlationId,
      sessionId: payload.sessionId,
      contactId: payload.contactId,
      serviceId: payload.serviceId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName,
      email: payload.email,
      uniqueReference: payload.uniqueReference,
      loa: payload.loa,
      aal: payload.aal,
      enrolmentCount: payload.enrolmentCount,
      enrolmentRequestCount: payload.enrolmentRequestCount,
      currentRelationshipId: payload.currentRelationshipId,
      relationships: payload.relationships,
      roles: payload.roles,
      isAuthenticated: true,
      idToken: refreshedSession.id_token,
      token: refreshedSession.access_token,
      refreshToken: refreshedSession.refresh_token,
      expiresIn: expiresInMilliSeconds,
      expiresAt: expiresAt.toISOString()
    },
    expiresInMilliSeconds
  )

  return getUserSession(request, request.state.session)
}
