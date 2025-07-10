import {
  getExemptionCache,
  updateExemptionSiteDetails
} from '~/src/server/common/helpers/session-cache/utils.js'
import {
  errorDescriptionByFieldName,
  mapErrorsForDisplay
} from '~/src/server/common/helpers/errors.js'
import { routes } from '~/src/server/common/constants/routes.js'

import joi from 'joi'

export const COORDINATE_SYSTEM_VIEW_ROUTE =
  'exemption/site-details/coordinate-system/index'

const coordinateSystemSettings = {
  pageTitle: 'Which coordinate system do you want to use?',
  heading: 'Which coordinate system do you want to use?',
  backLink: routes.COORDINATES_ENTRY_CHOICE
}

export const errorMessages = {
  COORDINATE_SYSTEM_REQUIRED: 'Select which coordinate system you want to use'
}

/**
 * A GDS styled page controller for the coordinate system page.
 * @satisfies {Partial<ServerRoute>}
 */
export const coordinateSystemController = {
  handler(request, h) {
    const exemption = getExemptionCache(request)

    const siteDetails = exemption.siteDetails ?? {}

    return h.view(COORDINATE_SYSTEM_VIEW_ROUTE, {
      ...coordinateSystemSettings,
      projectName: exemption.projectName,
      payload: {
        coordinateSystem: siteDetails.coordinateSystem
      }
    })
  }
}

/**
 * A GDS styled page controller for the POST route in the coordinate system page.
 * @satisfies {Partial<ServerRoute>}
 */
export const coordinateSystemSubmitController = {
  options: {
    validate: {
      payload: joi.object({
        coordinateSystem: joi
          .string()
          .valid('wgs84', 'osgb36')
          .required()
          .messages({
            'any.only': 'COORDINATE_SYSTEM_REQUIRED',
            'string.empty': 'COORDINATE_SYSTEM_REQUIRED',
            'any.required': 'COORDINATE_SYSTEM_REQUIRED'
          })
      }),
      failAction: (request, h, err) => {
        const { payload } = request

        const { projectName } = getExemptionCache(request)

        if (!err.details) {
          return h
            .view(COORDINATE_SYSTEM_VIEW_ROUTE, {
              ...coordinateSystemSettings,
              payload,
              projectName
            })
            .takeover()
        }

        const errorSummary = mapErrorsForDisplay(err.details, errorMessages)

        const errors = errorDescriptionByFieldName(errorSummary)

        return h
          .view(COORDINATE_SYSTEM_VIEW_ROUTE, {
            ...coordinateSystemSettings,
            payload,
            projectName,
            errors,
            errorSummary
          })
          .takeover()
      }
    }
  },
  handler(request, h) {
    const { payload } = request

    const exemption = getExemptionCache(request)

    updateExemptionSiteDetails(
      request,
      'coordinateSystem',
      payload.coordinateSystem
    )

    if (exemption.siteDetails?.coordinatesEntry === 'single') {
      return h.redirect(routes.CIRCLE_CENTRE_POINT)
    }

    if (exemption.siteDetails?.coordinatesEntry === 'multiple') {
      return h.redirect(routes.ENTER_MULTIPLE_COORDINATES)
    }

    return h.view(COORDINATE_SYSTEM_VIEW_ROUTE, {
      ...coordinateSystemSettings,
      projectName: exemption.projectName,
      payload: {
        coordinateSystem: payload.coordinateSystem
      }
    })
  }
}
