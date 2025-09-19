import path from 'path'
import hapi from '@hapi/hapi'

import bell from '@hapi/bell'
import cookie from '@hapi/cookie'
import basic from '@hapi/basic'
import { config } from '~/src/config/config.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { router } from './router.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'
import { csrf } from '~/src/server/common/helpers/csrf.js'
import { openId } from '~/src/server/common/plugins/open-id.js'
import { setPageCacheControlHeaders } from '~/src/server/common/helpers/cache-control.js'
import {
  cookieBannerFlashConsumer,
  cookieBannerContextInjector
} from '~/src/server/common/helpers/cookie-banner-flash-consumer.js'

export async function createServer() {
  setupProxy()
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ (config.get('session.cache.engine'))
        )
      }
    ],
    state: {
      strictHeader: false
    }
  })

  server.app.cache = server.cache({
    cache: 'session',
    expiresIn: config.get('redis.ttl'),
    segment: 'session'
  })

  // Configure cookie state definitions for automatic decoding
  server.state('cookies_policy', {
    encoding: 'base64json',
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
    path: '/',
    isSecure: process.env.NODE_ENV === 'production',
    isSameSite: 'Strict'
  })

  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    bell,
    cookie,
    basic,
    nunjucksConfig,
    csrf,
    openId,
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  server.ext('onPostAuth', cookieBannerFlashConsumer)
  server.ext('onPreResponse', cookieBannerContextInjector)
  server.ext('onPreResponse', setPageCacheControlHeaders)
  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
