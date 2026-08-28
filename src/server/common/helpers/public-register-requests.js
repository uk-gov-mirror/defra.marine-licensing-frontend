import Wreck from '@hapi/wreck'
import { config } from '#src/config/config.js'
import { getTraceId } from '@defra/hapi-tracing'

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {string} endpoint
 */
export const publicRegisterGetRequest = async (request, endpoint) => {
  const headers = {
    'Content-Type': 'application/json'
  }

  const tracingHeader = config.get('tracing.header')
  const traceId = getTraceId()

  if (traceId) {
    headers[tracingHeader] = traceId
  }

  const url = `${config.get('publicRegister').apiUrl}${endpoint}`

  return Wreck.get(url, {
    headers,
    json: true
  })
}
