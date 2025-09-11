import { routes } from '~/src/server/common/constants/routes.js'
import { setUserSession } from './utils.js'

export const signInOidcEntraController = {
  method: ['GET', 'POST'],
  path: routes.AUTH_ENTRA_ID_CALLBACK,
  options: {
    auth: 'entra-id'
  },
  handler: async (request, h) => {
    await setUserSession(request)
    request.logger.info('User has been successfully authenticated')

    const redirect = request.yar.flash('redirectPath')

    return h.redirect(redirect)
  }
}
