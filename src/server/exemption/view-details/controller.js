import Boom from '@hapi/boom'
import { errorMessages } from '#src/server/common/constants/error-messages.js'
import { routes } from '#src/server/common/constants/routes.js'
import { processSiteDetails } from '#src/server/common/helpers/exemptions/exemption-site-details.js'
import { buildSiteLocationData } from '#src/server/common/helpers/site-location-data.js'
import { getExemptionService } from '#src/services/exemption-service/index.js'
import { getTagStyle } from '#src/server/common/helpers/ui/get-tag-style.js'
import {
  isInternalUserView as getIsInternalUserView,
  isProjectViewable
} from '#src/server/common/helpers/view-details/utils.js'
import { EXEMPTIONS_KEY } from '#src/server/common/constants/exemptions.js'
import { withAnswersLinkType } from '#src/server/common/helpers/mcms-context/is-downloadable-pdf.js'
import { getUserSession } from '#src/server/common/plugins/auth/utils.js'

export const VIEW_DETAILS_VIEW_ROUTE = 'exemption/view-details/index'

const getApplicantName = async (request, exemption) => {
  if (exemption.organisation?.name) {
    return exemption.organisation.name
  }

  const userSession = await getUserSession(request, request.state?.userSession)
  return userSession?.displayName
}

export const viewDetailsController = {
  async handler(request, h) {
    const { exemptionId } = request.params

    const isInternalUserView = getIsInternalUserView(request, EXEMPTIONS_KEY)

    const isPublicView = request.path.startsWith(routes.VIEW_DETAILS_PUBLIC)

    const isApplicantView = !isInternalUserView && !isPublicView

    try {
      const serviceMethod = isPublicView
        ? 'getPublicExemptionById'
        : 'getExemptionById'
      const exemptionService = getExemptionService(request)
      const exemption = await exemptionService[serviceMethod](exemptionId)

      if (!isProjectViewable(exemption)) {
        request.logger.error(
          {
            id: exemptionId,
            status: exemption.status,
            hasApplicationReference: !!exemption.applicationReference
          },
          errorMessages.EXEMPTION_NOT_SUBMITTED
        )

        throw Boom.forbidden(errorMessages.EXEMPTION_NOT_SUBMITTED)
      }
      const siteDetails = processSiteDetails(exemption, exemptionId, request)
      const { multipleSiteDetails } = exemption

      const siteLocationData = buildSiteLocationData(
        multipleSiteDetails,
        exemption.siteDetails
      )

      const statusTagClass = getTagStyle(exemption.status)

      const whoExemptionIsFor = isApplicantView
        ? await getApplicantName(request, exemption)
        : exemption.whoExemptionIsFor

      return h.view(VIEW_DETAILS_VIEW_ROUTE, {
        pageTitle: exemption.projectName,
        pageCaption: exemption.applicationReference,
        backLink: isApplicantView ? routes.DASHBOARD : null,
        isReadOnly: true,
        isApplicantView,
        ...exemption,
        whoExemptionIsFor,
        mcmsContext: withAnswersLinkType(exemption.mcmsContext),
        statusTagClass,
        siteDetails,
        multipleSiteDetails,
        siteLocationData,
        publicRegisterRoute: routes.PUBLIC_REGISTER
      })
    } catch (error) {
      if (error.isBoom) {
        throw error
      }

      request.logger.error(error, 'Error displaying exemption details')
      throw Boom.internal('Error displaying exemption details')
    }
  }
}
