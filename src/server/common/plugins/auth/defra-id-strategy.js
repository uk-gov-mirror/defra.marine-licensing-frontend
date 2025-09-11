import { config } from '~/src/config/config.js'
import { openIdProvider } from '~/src/server/common/plugins/auth/open-id-provider.js'
import { routes } from '~/src/server/common/constants/routes.js'

export const createDefraIdStrategy = async (server) => {
  const defraIdConfig = config.get('defraId')
  const cookieConfig = config.get('session.cookie')

  if (!defraIdConfig.authEnabled) {
    server.auth.strategy('defra-id', 'basic', {
      validate: () => ({ isValid: true })
    })
    return
  }

  const provider = await openIdProvider('defraId')
  server.auth.strategy('defra-id', 'bell', {
    location: () =>
      `${defraIdConfig.redirectUrl}${routes.AUTH_DEFRA_ID_CALLBACK}`,
    provider,
    password: cookieConfig.password,
    clientId: defraIdConfig.clientId,
    clientSecret: defraIdConfig.clientSecret,
    isSecure: cookieConfig.secure,
    providerParams: {
      serviceId: defraIdConfig.serviceId
    }
  })
}
