import {
  getUserSession,
  removeUserSession,
  refreshAccessToken,
  updateUserSession
} from '~/src/server/common/plugins/auth/utils.js'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const validateUserSession = async (request, session) => {
  const userSession = await getUserSession(request, session)
  const logger = createLogger()
  logger.info('DEFRA ID LOG (validateUserSession): userSession', {
    userSession
  })
  if (!userSession) {
    return { isValid: false }
  }

  const tokenHasExpired = isPast(subMinutes(parseISO(userSession.expiresAt), 1))
  logger.info('DEFRA ID LOG (validateUserSession): tokenHasExpired', {
    tokenHasExpired
  })

  if (tokenHasExpired) {
    const response = await refreshAccessToken(request, session)

    if (!response.ok) {
      removeUserSession(request, session)
      return { isValid: false }
    }

    const refreshAccessTokenJson = response.json
    const updatedSession = await updateUserSession(
      request,
      refreshAccessTokenJson
    )

    logger.info('DEFRA ID LOG (validateUserSession): updatedSession', {
      updatedSession
    })

    return {
      isValid: true,
      credentials: updatedSession
    }
  }

  return { isValid: true, credentials: userSession }
}
