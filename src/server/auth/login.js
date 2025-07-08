import { routes } from '~/src/server/common/constants/routes.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const loginController = {
  method: 'GET',
  path: routes.LOGIN,
  options: {
    auth: {
      strategy: 'defra-id',
      mode: 'try'
    }
  },
  handler: (_request, h) => {
    const logger = createLogger()
    logger.info('DEFRA ID LOG (login controller): Request', {
      request: _request
    })
    return h.redirect(routes.PROJECT_NAME)
  }
}
