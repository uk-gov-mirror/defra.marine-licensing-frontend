import Boom from '@hapi/boom'
import joi from 'joi'
import {
  mapErrorsForDisplay,
  errorDescriptionByFieldName
} from '~/src/server/common/helpers/errors.js'
import {
  storeReferrer,
  getBackUrl,
  clearStoredReferrer
} from '~/src/server/common/helpers/referrer-validation.js'
import { getCookiePreferences } from '~/src/server/common/helpers/cookie-preferences.js'
import { routes } from '~/src/server/common/constants/routes.js'

const COOKIES_VIEW_ROUTE = 'help/cookies/index'

const cookiesPageSettings = {
  pageTitle: 'Cookies on Get permission for marine work'
}

const EXCLUDED_REFERRER_PATHS = [routes.COOKIES]

/**
 * Cookies page GET controller
 * @satisfies {Partial<ServerRoute>}
 */
export const cookiesController = {
  options: {
    auth: false
  },
  handler(request, h) {
    const preferences = getCookiePreferences(request)
    const referer = request.headers.referer
    const showSuccessBanner = request.query.success === 'true'

    if (referer && !referer.includes(routes.COOKIES)) {
      storeReferrer(request, referer, EXCLUDED_REFERRER_PATHS)
    }

    const backUrl = getBackUrl(request, '/', EXCLUDED_REFERRER_PATHS)

    if (showSuccessBanner) {
      clearStoredReferrer(request)
    }

    return h.view(COOKIES_VIEW_ROUTE, {
      ...cookiesPageSettings,
      backUrl,
      payload: {
        analytics: preferences.analytics ? 'yes' : 'no'
      },
      showSuccessBanner,
      isAuthenticated: request.auth.isAuthenticated
    })
  }
}

/**
 * Cookie preferences POST controller - handles both page form and banner submissions
 * @satisfies {Partial<ServerRoute>}
 */
export const cookiesSubmitController = {
  options: {
    auth: false,
    validate: {
      payload: joi.object({
        csrfToken: joi.string().allow(''),
        analytics: joi.string().valid('yes', 'no').required().messages({
          'any.only': 'ANALYTICS_CHOICE_REQUIRED',
          'string.empty': 'ANALYTICS_CHOICE_REQUIRED',
          'any.required': 'ANALYTICS_CHOICE_REQUIRED'
        }),
        source: joi.string().valid('page', 'banner').optional()
      }),
      failAction: (request, h, err) => {
        const { payload } = request

        // Get back URL from session with fallback to '/'
        const backUrl = getBackUrl(request, '/', EXCLUDED_REFERRER_PATHS)

        if (!err.details) {
          return h
            .view(COOKIES_VIEW_ROUTE, {
              ...cookiesPageSettings,
              backUrl,
              payload,
              isAuthenticated: request.auth.isAuthenticated
            })
            .takeover()
        }

        const errorSummary = mapErrorsForDisplay(err.details, {
          ANALYTICS_CHOICE_REQUIRED:
            'Select yes if you want to accept analytics cookies'
        })

        const errors = errorDescriptionByFieldName(errorSummary)

        return h
          .view(COOKIES_VIEW_ROUTE, {
            ...cookiesPageSettings,
            backUrl,
            payload,
            errors,
            errorSummary,
            isAuthenticated: request.auth.isAuthenticated
          })
          .takeover()
      }
    }
  },
  handler(request, h) {
    const { payload } = request
    const analytics = payload.analytics === 'yes'
    const isFromBanner = payload.source === 'banner'

    try {
      const timestamp = Math.floor(Date.now() / 1000)

      const cookiesPolicy = {
        essential: true,
        analytics,
        timestamp
      }

      // Different redirect behavior based on source
      const redirectUrl = isFromBanner
        ? request.headers.referer || '/'
        : `${routes.COOKIES}?success=true`

      const response = h.redirect(redirectUrl)

      const cookieOptions = {
        ttl: 365 * 24 * 60 * 60 * 1000,
        path: '/',
        isSecure: process.env.NODE_ENV === 'production',
        isSameSite: 'Strict'
      }

      const cookieOptionsB64 = {
        ...cookieOptions,
        encoding: 'base64json'
      }

      response.state('cookies_policy', cookiesPolicy, cookieOptionsB64)
      response.state('cookies_preferences_set', 'true', cookieOptions)

      if (isFromBanner) {
        request.yar.flash('showCookieConfirmationBanner', true)
      }

      return response
    } catch (error) {
      const msg = 'Error saving cookie preferences'
      request.logger.error(error, msg)
      throw Boom.internal(msg)
    }
  }
}
