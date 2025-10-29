export const getSiteNumber = (exemption, request) => {
  const { siteDetails } = exemption || {}
  const urlSiteIndex = request?.query?.site

  request.logger.info('Logging siteDetails from getSiteNumber')
  request.logger.info({ siteDetails })

  request.logger.info('Logging site query parameter in getSiteNumber')
  request.logger.info({ urlSiteIndex })

  if (Array.isArray(siteDetails) && urlSiteIndex) {
    const siteNumber = Number.parseInt(urlSiteIndex, 10)

    request.logger.info(
      `Conditions met to correctly return site number from getSiteNumber`
    )

    if (!Number.isNaN(siteNumber) && siteDetails?.[siteNumber - 1]) {
      request.logger.info(
        `Correctly returning ${siteNumber} from getSiteNumber`
      )
      return siteNumber
    }
  }

  request.logger.info(
    'Returning 1 from getSiteNumber due to conditions not being met'
  )

  return 1
}
