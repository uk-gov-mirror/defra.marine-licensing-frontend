import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config/config.js'
import { defraId } from './common/helpers/auth/defra-id.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { auth } from './auth/index.js'
import { login } from './login/index.js'
import { router } from './router.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'

export async function createServer() {
  setupProxy()
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: { abortEarly: false }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: false },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: { stripTrailingSlash: true },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ (config.get('session.cache.engine'))
        )
      }
    ],
    state: { strictHeader: false }
  })

  const isTest = config.get('env') === 'test'

  if (isTest) {
    server.auth.scheme('dummy', () => ({
      authenticate(request, h) {
        return h.authenticated({
          credentials: {
            profile: {
              email: 'dimitri@alpha.com',
              roles: [],
              relationships: []
            },
            expiresIn: 3600
          }
        })
      }
    }))
    server.auth.strategy('defra-id', 'dummy', {})
    server.auth.default('defra-id')
  }

  const plugins = [
    ...(isTest ? [] : [defraId]),
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    auth,
    login,
    router
  ]

  await server.register(plugins)
  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
