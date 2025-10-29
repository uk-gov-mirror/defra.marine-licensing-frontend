import { routes } from '#src/server/common/constants/routes.js'
import { getUserSession } from '#src/server/common/plugins/auth/utils.js'

export const getSiteNumber = async (exemption, request) => {
  const { siteDetails } = exemption || {}
  const urlSiteIndex = request?.query?.site

  const userSession = await getUserSession(request, request.state?.userSession)
  const contactId = userSession?.contactId
  const email = userSession?.email

  if (request.path === routes.SITE_NAME) {
    request.logger.info(
      { contactId, email, urlSiteIndex, siteDetails },
      `Started getSiteNumber function with the following variables`
    )
  }

  if (Array.isArray(siteDetails) && urlSiteIndex) {
    const siteNumber = Number.parseInt(urlSiteIndex, 10)

    if (request.path === routes.SITE_NAME) {
      request.logger.info(
        { contactId, email },
        `Conditions met to correctly return site number from getSiteNumber`
      )
    }

    if (!Number.isNaN(siteNumber) && siteDetails?.[siteNumber - 1]) {
      if (request.path === routes.SITE_NAME) {
        request.logger.info(
          { contactId, email, siteNumber },
          `Correctly returning ${siteNumber} from getSiteNumber`
        )
      }

      return siteNumber
    }
  }

  if (request.path === routes.SITE_NAME) {
    request.logger.info(
      { contactId, email },
      'Returning 1 from getSiteNumber due to conditions not being met'
    )
  }

  return 1
}
