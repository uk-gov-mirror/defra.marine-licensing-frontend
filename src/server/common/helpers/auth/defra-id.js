import fetch from 'node-fetch'
import jwt from '@hapi/jwt'
import bell from '@hapi/bell'

import { config } from '~/src/config/config.js'

const defraId = {
  plugin: {
    name: 'defra-id',
    register: async (server) => {
      const oidcConfigurationUrl = config.get('defraIdOidcConfigurationUrl')
      const serviceId = config.get('defraIdServiceId')
      const clientId = config.get('defraIdClientId')
      const clientSecret = config.get('defraIdClientSecret')
      const authCallbackUrl = config.get('appBaseUrl') + '/auth/callback'

      await server.register(bell)

      const oidcConf = await fetch(oidcConfigurationUrl).then((res) =>
        res.json()
      )

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
              .filter((part) => part)
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
        providerParams: {
          serviceId
        }
      })
      server.ext('onPostAuth', (request, h) => {
        if (request.path === '/auth/callback' && request.auth.isAuthenticated) {
          const profile = request.auth.credentials.profile
          request.yar.set('user', profile)
          return h.redirect('/')
        }
        return h.continue
      })
    }
  }
}

export { defraId }
