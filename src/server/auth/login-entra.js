import { routes } from '~/src/server/common/constants/routes.js'

export const loginEntraController = {
  method: 'GET',
  path: routes.LOGIN_ENTRA,
  options: {
    auth: 'entra-id'
  },
  handler: (_request, h) => {
    const redirect = _request.yar.flash('redirectPath')
    return h.redirect(redirect || '/')
  }
}
