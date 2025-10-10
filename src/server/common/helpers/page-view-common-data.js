import { getUserSession } from '#src/server/common/plugins/auth/utils.js'

export const getPageViewCommonData = async (request) => {
  const userSession = await getUserSession(request, request.state?.userSession)
  if (!userSession) {
    return {}
  }
  const { applicantOrganisationName, hasMultipleOrganisations } = userSession
  return { applicantOrganisationName, hasMultipleOrganisations }
}
