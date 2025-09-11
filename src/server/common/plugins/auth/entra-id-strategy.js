import { config } from '~/src/config/config.js'
import { openIdProvider } from '~/src/server/common/plugins/auth/open-id-provider.js'
import { routes } from '~/src/server/common/constants/routes.js'

export const createEntraIdStrategy = async (server) => {
  const entraIdConfig = config.get('entraId')
  const cookieConfig = config.get('session.cookie')
  if (!entraIdConfig.authEnabled) {
    server.auth.strategy('entra-id', 'basic', {
      validate: () => ({ isValid: true })
    })
    return
  }
  const provider = await openIdProvider('entraId')
  server.auth.strategy('entra-id', 'bell', {
    location: () =>
      `${entraIdConfig.redirectUrl}${routes.AUTH_ENTRA_ID_CALLBACK}`,
    provider,
    password: cookieConfig.password,
    clientId: entraIdConfig.clientId,
    clientSecret: entraIdConfig.clientSecret,
    isSecure: cookieConfig.secure
  })
}
