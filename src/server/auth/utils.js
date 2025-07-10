import { addSeconds } from 'date-fns'
import { config } from '~/src/config/config.js'

export const setUserSession = async (request) => {
  const { profile } = request.auth.credentials
  const expiresInSeconds = request.auth.credentials.expiresIn
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds)

  await request.server.app.cache.set(
    profile.sessionId,
    {
      ...profile,
      strategy: request.auth.strategy,
      isAuthenticated: request.auth.isAuthenticated,
      token: request.auth.credentials.token,
      refreshToken: request.auth.credentials.refreshToken,
      expiresIn: expiresInMilliSeconds,
      expiresAt: expiresAt.toISOString()
    },
    config.get('session.cache.ttl')
  )

  request.cookieAuth.set({ sessionId: profile.sessionId })
}
