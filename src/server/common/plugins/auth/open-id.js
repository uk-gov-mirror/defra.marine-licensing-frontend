import Jwt from '@hapi/jwt'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const openIdProvider = (name, oidcConf) => {
  const authConfig = config.get('defraId')
  return {
    name,
    protocol: 'oauth2',
    useParamsAuth: true,
    auth: oidcConf.authorization_endpoint,
    token: oidcConf.token_endpoint,
    pkce: 'S256',
    scope: authConfig.scopes,
    profile: (credentials, params) => {
      const logger = createLogger()

      logger.info(
        `DEFRA ID LOG (openIdProvider - profile - credentials): ${JSON.stringify(credentials)}`
      )

      logger.info(
        `DEFRA ID LOG (openIdProvider - profile - params): ${JSON.stringify(params)}`
      )
      if (!credentials?.token) {
        throw new Error(
          `${name} Auth Access Token not present. Unable to retrieve profile.`
        )
      }

      const payload = Jwt.token.decode(credentials.token).decoded.payload
      const displayName = [payload.firstName, payload.lastName]
        .filter((part) => part)
        .join(' ')
      logger.info(
        `DEFRA ID LOG (openIdProvider - profile - Jwt.token.decode): ${JSON.stringify(payload)}`
      )

      credentials.profile = {
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
        idToken: params.id_token,
        tokenUrl: oidcConf.token_endpoint,
        logoutUrl: oidcConf.end_session_endpoint
      }
    }
  }
}
