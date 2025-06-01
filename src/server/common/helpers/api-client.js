import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'

/**
 * Makes authenticated API calls to the backend service
 * @param {object} request - Hapi request object
 * @param {string} endpoint - API endpoint path (e.g., '/exemptions/123')
 * @param {object} options - Wreck request options
 * @returns {Promise<{res: object, payload: any}>} Response from backend
 */
export async function callBackendApi(request, endpoint, options = {}) {
  // Get user session from frontend auth
  const user = request.yar.get('user')

  if (!user?.idToken) {
    throw new Error('User not authenticated - no JWT token available')
  }

  // Add JWT token to backend request
  const headers = {
    Authorization: `Bearer ${user.idToken}`,
    'Content-Type': 'application/json',
    ...options.headers
  }

  const backendUrl = config.get('backend.apiUrl')

  if (!backendUrl) {
    throw new Error('Backend API URL not configured')
  }

  try {
    const { res, payload } = await Wreck.request(
      options.method || 'GET',
      `${backendUrl}${endpoint}`,
      {
        headers,
        json: true,
        ...options
      }
    )

    return { res, payload }
  } catch (error) {
    // Log the error for debugging
    request.logger?.error('Backend API call failed:', {
      endpoint,
      error: error.message,
      statusCode: error.output?.statusCode
    })

    // Re-throw with more context
    throw new Error(`Backend API call failed: ${error.message}`)
  }
}

/**
 * Convenience method for GET requests
 */
export async function getFromBackend(request, endpoint, options = {}) {
  return callBackendApi(request, endpoint, { ...options, method: 'GET' })
}

/**
 * Convenience method for POST requests
 */
export async function postToBackend(request, endpoint, payload, options = {}) {
  return callBackendApi(request, endpoint, {
    ...options,
    method: 'POST',
    payload
  })
}

/**
 * Convenience method for PATCH requests
 */
export async function patchToBackend(request, endpoint, payload, options = {}) {
  return callBackendApi(request, endpoint, {
    ...options,
    method: 'PATCH',
    payload
  })
}

/**
 * Convenience method for DELETE requests
 */
export async function deleteFromBackend(request, endpoint, options = {}) {
  return callBackendApi(request, endpoint, { ...options, method: 'DELETE' })
}
