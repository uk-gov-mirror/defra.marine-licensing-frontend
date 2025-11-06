import {
  clearReturnToCheckYourAnswersFlag,
  getExemptionCache,
  getReturnToCheckYourAnswersFlag,
  resetExemptionSiteDetails,
  setExemptionCache,
  setReturnToCheckYourAnswersFlag
} from '#src/server/common/helpers/session-cache/utils.js'
import { routes } from '#src/server/common/constants/routes.js'
import {
  renderFileUploadReview,
  renderManualCoordinateReview
} from './utils.js'
import { getExemptionService } from '#src/services/exemption-service/index.js'
import { getSiteDetailsBySite } from '#src/server/common/helpers/session-cache/site-details-utils.js'

export const REVIEW_SITE_DETAILS_VIEW_ROUTE =
  'exemption/site-details/review-site-details/index'

export const FILE_UPLOAD_REVIEW_VIEW_ROUTE =
  'exemption/site-details/review-site-details/file-upload-review'

const reviewSiteDetailsPageData = {
  pageTitle: 'Review site details',
  heading: 'Review site details'
}
export const reviewSiteDetailsController = {
  async handler(request, h) {
    const previousPage = request.headers?.referer
    const exemption = getExemptionCache(request)
    const fromCheckYourAnswers = request.query?.from === 'check-your-answers'

    request.yar.clear('savedSiteDetails')

    if (fromCheckYourAnswers) {
      await setReturnToCheckYourAnswersFlag(request, h)
    } else {
      await clearReturnToCheckYourAnswersFlag(request, h)
    }

    if (!exemption.id) {
      return h.redirect(routes.TASK_LIST)
    }

    const exemptionService = getExemptionService(request)
    const completeExemption = await exemptionService.getExemptionById(
      exemption.id
    )

    const { projectName, publicRegister, multipleSiteDetails, siteDetails } =
      completeExemption

    setExemptionCache(request, {
      id: exemption.id,
      projectName,
      publicRegister,
      multipleSiteDetails,
      siteDetails
    })

    const firstSite = getSiteDetailsBySite({
      ...completeExemption,
      siteDetails
    })
    const { coordinatesType } = firstSite

    const returnToCheckYourAnswers = getReturnToCheckYourAnswersFlag(request)

    return coordinatesType === 'file'
      ? renderFileUploadReview(h, {
          exemption: completeExemption,
          siteDetails,
          previousPage,
          reviewSiteDetailsPageData,
          returnToCheckYourAnswers
        })
      : renderManualCoordinateReview(h, {
          exemption: completeExemption,
          siteDetails,
          previousPage,
          reviewSiteDetailsPageData,
          returnToCheckYourAnswers
        })
  }
}
export const reviewSiteDetailsSubmitController = {
  async handler(request, h) {
    const { payload } = request
    const exemption = getExemptionCache(request)

    if (!exemption.id) {
      return h.redirect(routes.TASK_LIST)
    }

    const exemptionService = getExemptionService(request)
    const completeExemption = await exemptionService.getExemptionById(
      exemption.id
    )

    const siteDetails = completeExemption.siteDetails

    if (payload?.add) {
      const updatedSiteDetails = [
        ...siteDetails,
        { coordinatesType: siteDetails[0].coordinatesType }
      ]
      setExemptionCache(request, {
        ...completeExemption,
        siteDetails: updatedSiteDetails
      })

      return h.redirect(`${routes.SITE_NAME}?site=${updatedSiteDetails.length}`)
    }

    const returnToCheckYourAnswers = getReturnToCheckYourAnswersFlag(request)
    if (returnToCheckYourAnswers) {
      await clearReturnToCheckYourAnswersFlag(request, h)
      return h.redirect(routes.CHECK_YOUR_ANSWERS)
    }

    resetExemptionSiteDetails(request)
    return h.redirect(routes.TASK_LIST)
  }
}
