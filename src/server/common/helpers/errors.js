import { statusCodes } from '~/src/server/common/constants/status-codes.js'

/**
 * @param {number} statusCode
 */
function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

/**
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error({ stack: response?.stack }, 'Error occurred')
  }

  return h
    .view('error/index', {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}

/**
 * Outputs all errors to an object with the field name as the key
 * @param { ValidationError[] } errors
 */
export const errorDescriptionByFieldName = (errors = []) => {
  return errors.reduce((error, obj) => {
    error[obj.field] = obj
    return error
  }, {})
}

/**
 * Format errors for error summary component, returning one error per field
 * @param { ValidationError[] } errors
 * @param { {[key: string]: string} } messages
 */
export const mapErrorsForDisplay = (errors = [], messages = {}) => {
  const errorFields = new Set()

  return errors
    .filter((error) => {
      const field = error.field || error.path
      if (errorFields.has(field[0])) {
        return false
      }

      errorFields.add(field[0])
      return true
    })
    .map((error) => {
      const field = error.field || error.path
      return {
        href: `#${field}`,
        text: messages[error.message] ?? error.message,
        field
      }
    })
}

/**
 * @import { Request, ResponseToolkit, ValidationError } from '@hapi/hapi'
 */
