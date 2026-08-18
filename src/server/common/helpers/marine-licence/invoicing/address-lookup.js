import { getTraceId } from '@defra/hapi-tracing'
import { config } from '#src/config/config.js'
import { getAccessToken } from '#src/server/common/helpers/marine-licence/invoicing/address-lookup-token.js'

const HTTP_STATUS_NO_CONTENT = 204
const HTTP_STATUS_UNAUTHORIZED = 401

export const normalisePostcode = (postcode = '') =>
  postcode.toUpperCase().replaceAll(/\s+/g, '')

// Deliberately excludes addressLine: it holds the whole formatted address, so
// matching against it makes a search for "7" or a street name match every result.
const MATCHABLE_FIELDS = ['subBuildingName', 'buildingName', 'buildingNumber']

const matchesPropertyNameOrNumber = (result, searchTerm) =>
  MATCHABLE_FIELDS.some((field) =>
    String(result?.[field] ?? '')
      .toLowerCase()
      .includes(searchTerm)
  )

export const filterByPropertyNameOrNumber = (results, propertyNameOrNumber) => {
  const addresses = results ?? []
  const searchTerm = (propertyNameOrNumber ?? '').trim().toLowerCase()

  if (!searchTerm) {
    return addresses
  }

  return addresses.filter((result) =>
    matchesPropertyNameOrNumber(result, searchTerm)
  )
}

const buildLookupUrl = (postcode) => {
  const { apiUrl, maxResults } = config.get('addressLookup')
  const query = new URLSearchParams({
    postcode: normalisePostcode(postcode),
    maxresults: String(maxResults)
  })
  return `${apiUrl}?${query}`
}

// header.totalResults is how many the API has for the postcode; results is what it
// returned, capped at maxresults. The difference is what tells us the set is truncated.
const parseLookupResponse = async (response) => {
  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return { results: [], totalResults: 0 }
  }

  const data = await response.json()
  const results = Array.isArray(data?.results) ? data.results : []

  return {
    results,
    totalResults: Number(data?.header?.totalResults) || results.length
  }
}

const buildLookupHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  // Propagate the CDP tracing header, as authenticated-requests.js does for the backend.
  const traceId = getTraceId()
  if (traceId) {
    headers[config.get('tracing.header')] = traceId
  }

  return headers
}

const performLookup = (url, token, signal) =>
  fetch(url, {
    method: 'GET',
    headers: buildLookupHeaders(token),
    signal
  })

// Returns the lookup response, retrying once with a fresh token if the first
// attempt is rejected as unauthorised (the cached token was revoked or expired early).
// The signal is a single deadline shared by every call, so the retry can't multiply
// the configured timeout.
const lookupWithTokenRetry = async (request, url, signal) => {
  const token = await getAccessToken(request, { signal })

  if (!token) {
    return null
  }

  const response = await performLookup(url, token, signal)

  if (response.status !== HTTP_STATUS_UNAUTHORIZED) {
    return response
  }

  request.logger.info(
    'Address lookup returned 401, refreshing the access token and retrying'
  )

  const refreshedToken = await getAccessToken(request, {
    forceRefresh: true,
    signal
  })

  if (!refreshedToken) {
    return null
  }

  return performLookup(url, refreshedToken, signal)
}

export const lookupAddresses = async (
  request,
  { postcode, propertyNameOrNumber }
) => {
  const url = buildLookupUrl(postcode)
  const signal = AbortSignal.timeout(config.get('addressLookup').timeout)

  try {
    const response = await lookupWithTokenRetry(request, url, signal)

    if (!response) {
      return { results: [], error: true }
    }

    if (!response.ok) {
      request.logger.error(
        { statusCode: response.status },
        'Address lookup request failed'
      )
      return { results: [], error: true }
    }

    const { results, totalResults } = await parseLookupResponse(response)

    // Filtering happens here because the API only searches by postcode, so a truncated
    // result set means a property search can miss an address that genuinely exists.
    // Flag it rather than reporting a confident "no addresses found".
    return {
      results: filterByPropertyNameOrNumber(results, propertyNameOrNumber),
      ...(totalResults > results.length ? { truncated: true } : {})
    }
  } catch (error) {
    request.logger.error(error, 'Address lookup request threw an error')
    return { results: [], error: true }
  }
}
