import { routes } from '~/src/server/common/constants/routes.js'
import { setUserSession } from './utils.js'
import { config } from '~/src/config/config.js'
import { AUTH_STRATEGIES } from '~/src/server/common/constants/auth.js'

export const signInOidcController = {
  method: ['GET', 'POST'],
  path: routes.AUTH_DEFRA_ID_CALLBACK,
  options: {
    auth: { strategy: AUTH_STRATEGIES.DEFRA_ID, mode: 'try' }
  },
  handler: async (request, h) => {
    const { authEnabled } = config.get('defraId')

    if (authEnabled && request.auth?.isAuthenticated) {
      await setUserSession(request)
      request.logger.info('User has been successfully authenticated')
      request.logger.info('Access token: ' + request.auth?.credentials?.token)
      request.logger.info(
        'ID token: ' + request.auth?.credentials?.profile?.idToken
      )
    }

    const redirect = request.yar.flash('referrer')?.at(0) ?? routes.PROJECT_NAME

    return h.redirect(redirect)
  }
}
