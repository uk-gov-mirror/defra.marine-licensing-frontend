import { config } from '~/src/config/config.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { validateUserSession } from '~/src/server/common/plugins/auth/validate.js'
import { cacheMcmsContextFromQueryParams } from '~/src/server/common/helpers/mcms-context/cache-mcms-context.js'
import { clearExemptionCache } from '~/src/server/common/helpers/session-cache/utils.js'

export const createSessionStrategy = (server) => {
  const cookieConfig = config.get('session.cookie')
  const defraIdConfig = config.get('defraId')
  const entraIdConfig = config.get('entraId')
  if (!defraIdConfig.authEnabled && !entraIdConfig.authEnabled) {
    return
  }

  server.auth.strategy('session', 'cookie', {
    cookie: {
      name: 'userSession',
      path: '/',
      password: cookieConfig.password,
      isSecure: cookieConfig.secure,
      ttl: cookieConfig.ttl,
      isSameSite: 'Lax'
    },
    keepAlive: true,
    redirectTo: (request) => {
      cacheMcmsContextFromQueryParams(request)
      request.yar.flash('redirectPath', request.path, true)
      return request.path.startsWith(routes.VIEW_DETAILS_INTERNAL_USER)
        ? routes.LOGIN_ENTRA
        : routes.LOGIN
    },
    validate: async (request, session) => {
      const validity = await validateUserSession(request, session)
      if (validity.isValid === false) {
        clearExemptionCache(request)
      }
      return validity
    }
  })

  server.auth.default('session')
}
