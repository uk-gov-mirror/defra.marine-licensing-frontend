import { getUserSession } from '~/src/server/common/plugins/auth/utils.js'

export const validateUserSession = async (request, session) => {
  const userSession = await getUserSession(request, session)

  if (!userSession) {
    return { isValid: false }
  }

  // TODO IN NEXT COMMIT

  //   const tokenHasExpired = isPast(subMinutes(parseISO(userSession.expiresAt), 1))

  //   if (tokenHasExpired) {
  //     const response = await refreshAccessToken(request)

  //     if (!response.ok) {
  //       removeUserSession(request, session)
  //       return { isValid: false }
  //     }

  //     const refreshAccessTokenJson = await response.json
  //     // const updatedSession = await updateUserSession(
  //     //   request,
  //     //   refreshAccessTokenJson
  //     // )

  //     // return {
  //     //   isValid: true,
  //     //   credentials: updatedSession
  //     // }
  //   }

  return { isValid: true, credentials: userSession }
}
