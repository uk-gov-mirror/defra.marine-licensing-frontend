import { config } from '#src/config/config.js'
import { openIdProvider } from '#src/server/common/plugins/auth/open-id-provider.js'
import { routes } from '#src/server/common/constants/routes.js'
import { AUTH_STRATEGIES } from '#src/server/common/constants/auth.js'

export const getDefraIdConfig = async (provider) => {
  const defraIdConfig = config.get('defraId')
  const cookieConfig = config.get('session.cookie')

  return {
    location: () =>
      `${defraIdConfig.redirectUrl}${routes.AUTH_DEFRA_ID_CALLBACK}`,
    provider,
    password: cookieConfig.password,
    clientId: defraIdConfig.clientId,
    clientSecret: defraIdConfig.clientSecret,
    isSecure: cookieConfig.secure,
    providerParams: (request) => {
      return {
        serviceId: defraIdConfig.serviceId,
        ...(request.query['change-organisation'] === 'true'
          ? { forceReselection: true }
          : {})
      }
    }
  }
}

export const createDefraIdStrategy = async (server) => {
  const provider = await openIdProvider('defraId')
  const authConfig = await getDefraIdConfig(provider)
  server.auth.strategy(AUTH_STRATEGIES.DEFRA_ID, 'bell', authConfig)
}
