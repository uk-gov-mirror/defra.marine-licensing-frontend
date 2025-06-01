import Wreck from '@hapi/wreck'
import jwt from '@hapi/jwt'
import bell from '@hapi/bell'
import cookie from '@hapi/cookie'

import { config } from '~/src/config/config.js'
import { refreshTokens } from './refresh-tokens.js'

async function getOidcConfig(url) {
  const { payload } = await Wreck.get(url, { json: true })
  return payload
}

function registerBellStrategy(
  server,
  oidcConf,
  authCallbackUrl,
  serviceId,
  clientId,
  clientSecret
) {
  server.auth.strategy('defra-id', 'bell', {
    location: (request) => {
      if (request.info.referrer) {
        request.yar.flash('referrer', request.info.referrer)
      }
      return authCallbackUrl
    },
    provider: {
      name: 'defra-id',
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcConf.authorization_endpoint,
      token: oidcConf.token_endpoint,
      scope: ['openid', 'offline_access'],
      profile: function (credentials, params) {
        const payload = jwt.token.decode(credentials.token).decoded.payload
        const displayName = [payload.firstName, payload.lastName]
          .filter(Boolean)
          .join(' ')
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
    },
    password: config.get('session.cookie.password'),
    clientId,
    clientSecret,
    cookie: 'bell-defra-id',
    isSecure: false,
    providerParams: { serviceId }
  })

  server.ext('onPostAuth', (request, h) => {
    if (request.path === '/auth/callback' && request.auth.isAuthenticated) {
      request.yar.set('user', request.auth.credentials.profile)
      return h.redirect('/')
    }
    return h.continue
  })
}

function registerSessionStrategy(server) {
  server.register(cookie)
  server.auth.strategy('session', 'cookie', {
    cookie: {
      name: 'sess-defra-id',
      password: config.get('session.cookie.password'),
      isSecure: false,
      path: '/'
    },
    redirectTo: false,
    validate: async (request, session) => {
      const data = await request.server.app.cache.get(session.sessionId)
      if (!data) {
        return { isValid: false }
      }
      try {
        jwt.token.verifyTime(jwt.token.decode(data.accessToken))
        return { isValid: true, credentials: data }
      } catch (err) {
        if (!config.get('defraIdRefreshTokens')) {
          return { isValid: false }
        }
        const {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn
        } = await refreshTokens(data.refreshToken)
        Object.assign(data, { accessToken, refreshToken, expiresIn })
        await request.server.app.cache.set(session.sessionId, data)
        return { isValid: true, credentials: data }
      }
    }
  })
  server.auth.default('session')
}

const defraId = {
  plugin: {
    name: 'defra-id',
    register: async (server) => {
      const oidcConfigurationUrl = config.get('defraIdOidcConfigurationUrl')
      const serviceId = config.get('defraIdServiceId')
      const clientId = config.get('defraIdClientId')
      const clientSecret = config.get('defraIdClientSecret')
      const authCallbackUrl = config.get('appBaseUrl') + '/auth/callback'

      if (!oidcConfigurationUrl) {
        server.log(
          ['warn', 'auth'],
          'Skipping defra-id plugin, no URL configured'
        )
        return
      }

      await server.register(bell)
      const oidcConf = await getOidcConfig(oidcConfigurationUrl)

      registerBellStrategy(
        server,
        oidcConf,
        authCallbackUrl,
        serviceId,
        clientId,
        clientSecret
      )
      registerSessionStrategy(server)
    }
  }
}

export { defraId }
