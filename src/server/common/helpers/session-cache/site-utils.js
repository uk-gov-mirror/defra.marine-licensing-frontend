import { getSiteDetailsBySite } from '#src/server/common/helpers/session-cache/site-details-utils.js'
import { getExemptionCache } from '#src/server/common/helpers/session-cache/utils.js'
import { getSiteNumber } from '#src/server/exemption/site-details/utils/site-number.js'
import { routes } from '#src/server/common/constants/routes.js'
import { getUserSession } from '#src/server/common/plugins/auth/utils.js'
export const setSiteData = async (request) => {
  const exemption = getExemptionCache(request)

  const userSession = await getUserSession(request, request.state?.userSession)
  const contactId = userSession?.contactId
  const email = userSession?.email

  if (request.path === routes.SITE_NAME) {
    request.logger.info(
      { contactId, email, exemption },
      'Logging exemption from cache'
    )
  }

  const siteNumber = await getSiteNumber(exemption, request)

  if (request.path === routes.SITE_NAME) {
    request.logger.info(
      { contactId, email },
      `siteNumber has been set to ${siteNumber} by getSiteNumber`
    )
  }

  const siteIndex = siteNumber - 1

  return {
    queryParams: siteNumber === 1 ? '' : `?site=${siteNumber}`,
    siteNumber,
    siteIndex,
    siteDetails: getSiteDetailsBySite(exemption, siteIndex)
  }
}
export const setSiteDataPreHandler = {
  method: async (request, h) => {
    request.site = await setSiteData(request)

    return h.continue
  }
}
