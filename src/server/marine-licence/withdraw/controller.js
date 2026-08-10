import { authenticatedPostRequest } from '#src/server/common/helpers/authenticated-requests.js'
import {
  routes,
  marineLicenceRoutes
} from '#src/server/common/constants/routes.js'
import {
  getMarineLicenceCache,
  setMarineLicenceCache,
  clearMarineLicenceCache
} from '#src/server/common/helpers/marine-licence/session-cache/utils.js'
import Boom from '@hapi/boom'
import { MARINE_LICENCE_TYPE } from '#src/server/common/constants/marine-licence.js'
import { PROJECT_STATUS } from '#src/server/common/constants/projects.js'
import { getMarineLicenceService } from '#src/services/marine-licence-service/index.js'

export const WITHDRAW_MARINE_LICENCE_VIEW_ROUTE =
  'marine-licence/withdraw/index'

const WITHDRAW_MARINE_LICENCE_PAGE_TITLE =
  'Are you sure you want to withdraw this application?'

export const TERMS_AND_CONDITIONS_LINK =
  'https://assets.publishing.service.gov.uk/media/6938145b6a12691d48491c56/Terms_and_Conditions_for_carrying_out_chargeable_activities_for_marine_licensing.pdf'

export const withdrawMarineLicenceController = {
  handler: async (request, h) => {
    const { id: marineLicenceId } = getMarineLicenceCache(request)

    if (!marineLicenceId) {
      throw Boom.notFound('Marine licence not found')
    }

    try {
      const service = getMarineLicenceService(request)
      const marineLicence = await service.getMarineLicenceById(marineLicenceId)

      if (marineLicence?.status !== PROJECT_STATUS.SUBMITTED) {
        request.logger.error(
          { marineLicenceId, status: marineLicence?.status },
          'Marine licence cannot be withdrawn'
        )
        return h.redirect(routes.DASHBOARD)
      }

      return h.view(WITHDRAW_MARINE_LICENCE_VIEW_ROUTE, {
        pageTitle: WITHDRAW_MARINE_LICENCE_PAGE_TITLE,
        heading: WITHDRAW_MARINE_LICENCE_PAGE_TITLE,
        projectName: marineLicence.projectName,
        marineLicenceType: MARINE_LICENCE_TYPE,
        marineLicenceId,
        termsAndConditionsLink: TERMS_AND_CONDITIONS_LINK,
        backLink: routes.DASHBOARD,
        cancelLink: routes.DASHBOARD,
        routes
      })
    } catch (error) {
      request.logger.error(
        { err: error },
        'Error fetching project for withdraw'
      )

      return h.redirect(routes.DASHBOARD)
    }
  }
}

export const withdrawMarineLicenceSelectController = {
  async handler(request, h) {
    const { marineLicenceId } = request.params
    await clearMarineLicenceCache(request, h)
    await setMarineLicenceCache(request, h, { id: marineLicenceId })
    return h.redirect(marineLicenceRoutes.MARINE_LICENCE_WITHDRAW)
  }
}

export const withdrawMarineLicenceSubmitController = {
  handler: async (request, h) => {
    try {
      const { marineLicenceId } = request.payload
      const { id: cachedMarineLicenceId } = getMarineLicenceCache(request)

      if (!marineLicenceId || marineLicenceId !== cachedMarineLicenceId) {
        request.logger.error(
          {
            formMarineLicenceId: marineLicenceId,
            cachedMarineLicenceId
          },
          'Marine licence ID mismatch or missing'
        )
        return h.redirect(routes.DASHBOARD)
      }

      await authenticatedPostRequest(
        request,
        `/marine-licence/${marineLicenceId}/withdraw`,
        {}
      )

      request.logger.info(
        { marineLicenceId },
        `Withdrawn marine licence ${marineLicenceId}`
      )

      await clearMarineLicenceCache(request, h)

      return h.redirect(routes.DASHBOARD)
    } catch (error) {
      request.logger.error({ err: error }, 'Error withdrawing marine licence')
      return h.redirect(routes.DASHBOARD)
    }
  }
}
