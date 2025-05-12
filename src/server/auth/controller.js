import { v4 as uuidv4 } from 'uuid'
import { addSeconds } from 'date-fns'

export const authCallbackController = {
  options: {
    auth: 'defra-id'
  },
  handler: async (request, h) => {
    if (request.auth.isAuthenticated) {
      const { profile } = request.auth.credentials
      const expiresInSeconds = request.auth.credentials.expiresIn
      const sessionId = uuidv4()
      const sessionData = {
        profile,
        expiresAt: addSeconds(new Date(), expiresInSeconds)
      }

      await request.server.app.cache.set(sessionId, sessionData)

      request.cookieAuth.set({ sessionId })

      request.logger.info('User successfully authenticated via Defra-ID')
    }

    const redirectTo = request.yar.flash('referrer')?.[0] || '/'
    return h.redirect(redirectTo)
  }
}
