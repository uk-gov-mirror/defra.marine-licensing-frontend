import { vi } from 'vitest'
import {
  lookupAddresses,
  normalisePostcode,
  filterByPropertyNameOrNumber
} from '#src/server/common/helpers/marine-licence/invoicing/address-lookup.js'
import { createMockRequest } from '#src/server/test-helpers/mocks/helpers.js'
import { config } from '#src/config/config.js'

const tynesideHouse = {
  addressLine:
    'ENVIRONMENT AGENCY, TYNESIDE HOUSE, SKINNERBURN ROAD, NEWCASTLE BUSINESS PARK, NEWCASTLE UPON TYNE, NE4 7AR',
  subBuildingName: 'ENVIRONMENT AGENCY',
  buildingName: 'TYNESIDE HOUSE',
  street: 'SKINNERBURN ROAD',
  town: 'NEWCASTLE UPON TYNE',
  postcode: 'NE4 7AR'
}

const quaysideHouse = {
  addressLine: '116, QUAYSIDE HOUSE, SKINNERBURN ROAD, NEWCASTLE UPON TYNE',
  buildingNumber: '116',
  buildingName: 'QUAYSIDE HOUSE',
  street: 'SKINNERBURN ROAD',
  town: 'NEWCASTLE UPON TYNE',
  postcode: 'NE4 7AR'
}

const mockFetchResponse = ({ ok = true, status = 200, body = {} } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body)
})

describe('#addressLookup', () => {
  const request = createMockRequest()
  const apiUrl = config.get('addressLookup').apiUrl

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('#normalisePostcode', () => {
    test.each([
      ['ne4 7ar', 'NE47AR'],
      ['NE4 7AR', 'NE47AR'],
      ['  ne4   7ar  ', 'NE47AR']
    ])('should normalise "%s" to "%s"', (input, expected) => {
      expect(normalisePostcode(input)).toBe(expected)
    })

    test('should handle a missing postcode', () => {
      expect(normalisePostcode()).toBe('')
    })
  })

  describe('#filterByPropertyNameOrNumber', () => {
    const results = [tynesideHouse, quaysideHouse]

    test('should return all results when no search term is given', () => {
      expect(filterByPropertyNameOrNumber(results, '')).toEqual(results)
      expect(filterByPropertyNameOrNumber(results, undefined)).toEqual(results)
    })

    test('should filter by building name regardless of case', () => {
      expect(filterByPropertyNameOrNumber(results, 'tyneside house')).toEqual([
        tynesideHouse
      ])
    })

    test('should filter by sub building name', () => {
      expect(
        filterByPropertyNameOrNumber(results, 'Environment Agency')
      ).toEqual([tynesideHouse])
    })

    test('should filter by building number', () => {
      expect(filterByPropertyNameOrNumber(results, '116')).toEqual([
        quaysideHouse
      ])
    })

    test('should return an empty array when nothing matches', () => {
      expect(filterByPropertyNameOrNumber(results, 'The Mill')).toEqual([])
    })
  })

  describe('#lookupAddresses', () => {
    test('should call the lookup API with a normalised, encoded postcode', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ body: { results: [tynesideHouse] } })
      )

      await lookupAddresses(request, { postcode: 'ne4 7ar' })

      expect(fetch).toHaveBeenCalledWith(`${apiUrl}?postcode=NE47AR`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    })

    test('should return the results from a successful response', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ body: { results: [tynesideHouse, quaysideHouse] } })
      )

      const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(result).toEqual({ results: [tynesideHouse, quaysideHouse] })
    })

    test('should filter the results by property name or number', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ body: { results: [tynesideHouse, quaysideHouse] } })
      )

      const result = await lookupAddresses(request, {
        postcode: 'NE4 7AR',
        propertyNameOrNumber: 'Tyneside House'
      })

      expect(result).toEqual({ results: [tynesideHouse] })
    })

    test('should return no results for a 204 No Content response', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ ok: false, status: 204, body: null })
      )

      const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(result).toEqual({ results: [] })
    })

    test('should return no results when the response has no results array', async () => {
      fetch.mockResolvedValue(mockFetchResponse({ body: { header: {} } }))

      const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(result).toEqual({ results: [] })
    })

    test('should return an error when the API responds with a failure status', async () => {
      fetch.mockResolvedValue(mockFetchResponse({ ok: false, status: 500 }))

      const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(result).toEqual({ results: [], error: true })
      expect(request.logger.error).toHaveBeenCalledWith(
        { statusCode: 500 },
        'Address lookup request failed'
      )
    })

    test('should return an error when the request throws', async () => {
      const error = new Error('network down')
      fetch.mockRejectedValue(error)

      const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(result).toEqual({ results: [], error: true })
      expect(request.logger.error).toHaveBeenCalledWith(
        error,
        'Address lookup request threw an error'
      )
    })
  })
})
