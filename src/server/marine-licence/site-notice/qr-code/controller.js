import joi from 'joi'
import { config } from '#src/config/config.js'
import {
  errorDescriptionByFieldName,
  mapErrorsForDisplay
} from '#src/server/common/helpers/errors.js'
import {
  getSiteNoticeQrCode,
  SITE_NOTICE_QR_CODE_DEFAULT_SIZE
} from '#src/server/common/helpers/marine-licence/site-notice-qr-code.js'

const SITE_NOTICE_QR_CODE_VIEW_ROUTE =
  'marine-licence/site-notice/qr-code/index'

const siteNoticeQrCodeSettings = {
  pageTitle: 'Generate a site notice QR code',
  heading: 'Generate a site notice QR code'
}

const URL_SCHEME_MESSAGE = 'Enter a base URL starting with http:// or https://'
const MARINE_LICENCE_ID_MAX_LENGTH = 200
const MIN_SIZE_PIXELS = 60
const MAX_SIZE_PIXELS = 1000

const siteNoticeQrCodeSchema = joi.object({
  baseUrl: joi
    .string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.empty': 'Enter a base URL',
      'any.required': 'Enter a base URL',
      'string.uri': URL_SCHEME_MESSAGE,
      'string.uriCustomScheme': URL_SCHEME_MESSAGE
    }),
  marineLicenceId: joi
    .string()
    .trim()
    .max(MARINE_LICENCE_ID_MAX_LENGTH)
    .required()
    .messages({
      'string.empty': 'Enter a marine licence ID',
      'any.required': 'Enter a marine licence ID',
      'string.max': `Marine licence ID must be ${MARINE_LICENCE_ID_MAX_LENGTH} characters or fewer`
    }),
  size: joi
    .number()
    .integer()
    .min(MIN_SIZE_PIXELS)
    .max(MAX_SIZE_PIXELS)
    .default(SITE_NOTICE_QR_CODE_DEFAULT_SIZE)
    .messages({
      'number.base': 'Size must be a whole number of pixels',
      'number.integer': 'Size must be a whole number of pixels',
      'number.min': `Size must be at least ${MIN_SIZE_PIXELS} pixels`,
      'number.max': `Size must be ${MAX_SIZE_PIXELS} pixels or fewer`
    })
})

const formatErrors = (error) => {
  const errorSummary = mapErrorsForDisplay(error.details)
  return { errors: errorDescriptionByFieldName(errorSummary), errorSummary }
}

export const siteNoticeQrCodeController = {
  async handler(request, h) {
    const defaults = {
      baseUrl: config.get('appBaseUrl'),
      size: SITE_NOTICE_QR_CODE_DEFAULT_SIZE
    }

    if (Object.keys(request.query).length === 0) {
      return h.view(SITE_NOTICE_QR_CODE_VIEW_ROUTE, {
        ...siteNoticeQrCodeSettings,
        payload: defaults
      })
    }

    const { value, error } = siteNoticeQrCodeSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      return h.view(SITE_NOTICE_QR_CODE_VIEW_ROUTE, {
        ...siteNoticeQrCodeSettings,
        payload: { ...defaults, ...request.query },
        ...formatErrors(error)
      })
    }

    const qrCode = await getSiteNoticeQrCode(value.marineLicenceId, {
      baseUrl: value.baseUrl,
      size: value.size
    })

    return h.view(SITE_NOTICE_QR_CODE_VIEW_ROUTE, {
      ...siteNoticeQrCodeSettings,
      payload: value,
      qrCode
    })
  }
}
