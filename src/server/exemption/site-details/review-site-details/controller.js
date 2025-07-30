import {
  getExemptionCache,
  resetExemptionSiteDetails
} from '~/src/server/common/helpers/session-cache/utils.js'
import { routes } from '~/src/server/common/constants/routes.js'
import {
  getSiteDetails,
  prepareFileUploadDataForSave,
  prepareManualCoordinateDataForSave,
  renderFileUploadReview,
  renderManualCoordinateReview,
  handleSubmissionError
} from './utils.js'
import {
  authenticatedPatchRequest,
  authenticatedGetRequest
} from '~/src/server/common/helpers/authenticated-requests.js'

export const REVIEW_SITE_DETAILS_VIEW_ROUTE =
  'exemption/site-details/review-site-details/index'

export const FILE_UPLOAD_REVIEW_VIEW_ROUTE =
  'exemption/site-details/review-site-details/file-upload-review'

const reviewSiteDetailsPageData = {
  pageTitle: 'Review site details',
  heading: 'Review site details'
}

/**
 * A GDS styled page controller for the review site details page.
 * @satisfies {Partial<ServerRoute>}
 */
export const reviewSiteDetailsController = {
  async handler(request, h) {
    const previousPage = request.headers?.referer
    const exemption = getExemptionCache(request)
    const siteDetails = await getSiteDetails(
      request,
      exemption,
      authenticatedGetRequest
    )

    return siteDetails.coordinatesType === 'file'
      ? renderFileUploadReview(
          h,
          exemption,
          siteDetails,
          previousPage,
          reviewSiteDetailsPageData
        )
      : renderManualCoordinateReview(
          h,
          request,
          exemption,
          siteDetails,
          previousPage,
          reviewSiteDetailsPageData
        )
  }
}

/**
 * A GDS styled page controller for the POST route in the review site details page.
 * @satisfies {Partial<ServerRoute>}
 */
export const reviewSiteDetailsSubmitController = {
  async handler(request, h) {
    const exemption = getExemptionCache(request)
    const siteDetails = exemption.siteDetails ?? {}

    try {
      const dataToSave =
        siteDetails.coordinatesType === 'file'
          ? prepareFileUploadDataForSave(siteDetails, request)
          : prepareManualCoordinateDataForSave(exemption, request)

      await authenticatedPatchRequest(request, '/exemption/site-details', {
        siteDetails: dataToSave,
        id: exemption.id
      })

      resetExemptionSiteDetails(request)
      return h.redirect(routes.TASK_LIST)
    } catch (error) {
      throw handleSubmissionError(
        request,
        error,
        exemption.id,
        siteDetails.coordinatesType
      )
    }
  }
}
