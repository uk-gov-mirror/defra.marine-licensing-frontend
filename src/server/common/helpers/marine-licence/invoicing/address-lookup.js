import { config } from '#src/config/config.js'

const HTTP_STATUS_NO_CONTENT = 204

export const normalisePostcode = (postcode = '') =>
  postcode.toUpperCase().replaceAll(/\s+/g, '')

const MATCHABLE_FIELDS = [
  'subBuildingName',
  'buildingName',
  'buildingNumber',
  'addressLine'
]

const matchesPropertyNameOrNumber = (result, searchTerm) =>
  MATCHABLE_FIELDS.some((field) =>
    String(result?.[field] ?? '')
      .toLowerCase()
      .includes(searchTerm)
  )

export const filterByPropertyNameOrNumber = (
  results = [],
  propertyNameOrNumber
) => {
  const searchTerm = (propertyNameOrNumber ?? '').trim().toLowerCase()

  if (!searchTerm) {
    return results
  }

  return results.filter((result) =>
    matchesPropertyNameOrNumber(result, searchTerm)
  )
}

const buildLookupUrl = (postcode) => {
  const { apiUrl } = config.get('addressLookup')
  return `${apiUrl}?postcode=${encodeURIComponent(normalisePostcode(postcode))}`
}

const parseLookupResponse = async (response) => {
  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return []
  }

  const data = await response.json()
  return Array.isArray(data?.results) ? data.results : []
}

export const lookupAddresses = async (
  request,
  { postcode, propertyNameOrNumber }
) => {
  const url = buildLookupUrl(postcode)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok && response.status !== HTTP_STATUS_NO_CONTENT) {
      request.logger.error(
        { statusCode: response.status },
        'Address lookup request failed'
      )
      return { results: [], error: true }
    }

    const results = await parseLookupResponse(response)

    return {
      results: filterByPropertyNameOrNumber(results, propertyNameOrNumber)
    }
  } catch (error) {
    request.logger.error(error, 'Address lookup request threw an error')
    return { results: [], error: true }
  }
}
