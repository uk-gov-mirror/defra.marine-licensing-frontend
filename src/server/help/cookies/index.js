import {
  cookiesController,
  cookiesSubmitController,
  cookiesConsentController
} from './controller.js'
import { routes } from '~/src/server/common/constants/routes.js'

/**
 * Sets up the routes used in the cookies page.
 * @satisfies {Array<ServerRoute>}
 */
export const cookiesRoutes = [
  {
    method: 'GET',
    path: routes.COOKIES,
    ...cookiesController
  },
  {
    method: 'POST',
    path: routes.COOKIES,
    ...cookiesSubmitController
  },
  {
    method: 'POST',
    path: `${routes.COOKIES}/consent`,
    ...cookiesConsentController
  }
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
