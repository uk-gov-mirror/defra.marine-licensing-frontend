import { vi } from 'vitest'
import {
  lookupAddresses,
  normalisePostcode,
  filterByPropertyNameOrNumber
} from '#src/server/common/helpers/marine-licence/invoicing/address-lookup.js'
import { getAccessToken } from '#src/server/common/helpers/marine-licence/invoicing/address-lookup-token.js'
import { createMockRequest } from '#src/server/test-helpers/mocks/helpers.js'
import { config } from '#src/config/config.js'
import { getTraceId } from '@defra/hapi-tracing'

vi.mock(
  '#src/server/common/helpers/marine-licence/invoicing/address-lookup-token.js',
  () => ({
    getAccessToken: vi.fn()
  })
)

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn()
}))

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
    getAccessToken.mockResolvedValue('a-valid-token')
    getTraceId.mockReturnValue(null)
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

    test.each(['7', 'skinnerburn', 'newcastle'])(
      'should not match "%s" from the full address line',
      (searchTerm) => {
        expect(filterByPropertyNameOrNumber(results, searchTerm)).toEqual([])
      }
    )
  })

  describe('#lookupAddresses', () => {
    test('should call the lookup API with a normalised, encoded postcode and a bearer token', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ body: { results: [tynesideHouse] } })
      )

      await lookupAddresses(request, { postcode: 'ne4 7ar' })

      const { maxResults } = config.get('addressLookup')

      expect(fetch).toHaveBeenCalledWith(
        `${apiUrl}?postcode=NE47AR&maxresults=${maxResults}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer a-valid-token'
          },
          signal: expect.any(AbortSignal)
        }
      )
    })

    test('should propagate the CDP tracing header when a trace id is present', async () => {
      getTraceId.mockReturnValue('trace-abc-123')
      fetch.mockResolvedValue(mockFetchResponse({ body: { results: [] } }))

      await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(fetch.mock.calls[0][1].headers).toEqual(
        expect.objectContaining({
          [config.get('tracing.header')]: 'trace-abc-123'
        })
      )
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
      // A real 204 Response reports ok: true and has no body, so json() must
      // never be called - rejecting here proves we short-circuit before parsing.
      fetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn().mockRejectedValue(new Error('204 has no body'))
      })

      const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

      expect(result).toEqual({ results: [] })
    })

    describe('truncated result sets', () => {
      const bodyWithTotal = (results, totalResults) => ({
        header: { totalResults: String(totalResults) },
        results
      })

      test('should flag truncation when the API has more addresses than it returned', async () => {
        fetch.mockResolvedValue(
          mockFetchResponse({
            body: bodyWithTotal([tynesideHouse, quaysideHouse], 250)
          })
        )

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result.truncated).toBe(true)
      })

      test('should not flag truncation when every address was returned', async () => {
        fetch.mockResolvedValue(
          mockFetchResponse({
            body: bodyWithTotal([tynesideHouse, quaysideHouse], 2)
          })
        )

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result).toEqual({ results: [tynesideHouse, quaysideHouse] })
        expect(result.truncated).toBeUndefined()
      })

      test('should not flag truncation when the response has no header', async () => {
        fetch.mockResolvedValue(
          mockFetchResponse({ body: { results: [tynesideHouse] } })
        )

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result.truncated).toBeUndefined()
      })

      test('should keep the truncation flag when a property filter matches nothing', async () => {
        fetch.mockResolvedValue(
          mockFetchResponse({
            body: bodyWithTotal([tynesideHouse, quaysideHouse], 250)
          })
        )

        const result = await lookupAddresses(request, {
          postcode: 'NE4 7AR',
          propertyNameOrNumber: 'Nowhere House'
        })

        expect(result).toEqual({ results: [], truncated: true })
      })
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

    describe('authentication', () => {
      test('should not call the API when no token can be obtained', async () => {
        getAccessToken.mockResolvedValue(null)

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result).toEqual({ results: [], error: true })
        expect(fetch).not.toHaveBeenCalled()
      })

      test('should refresh the token and retry once on a 401', async () => {
        getAccessToken
          .mockResolvedValueOnce('a-stale-token')
          .mockResolvedValueOnce('a-fresh-token')

        fetch
          .mockResolvedValueOnce(mockFetchResponse({ ok: false, status: 401 }))
          .mockResolvedValueOnce(
            mockFetchResponse({ body: { results: [tynesideHouse] } })
          )

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result).toEqual({ results: [tynesideHouse] })
        expect(fetch).toHaveBeenCalledTimes(2)
        expect(getAccessToken).toHaveBeenNthCalledWith(2, request, {
          forceRefresh: true,
          signal: expect.any(AbortSignal)
        })
        expect(fetch.mock.calls[1][1].headers.Authorization).toBe(
          'Bearer a-fresh-token'
        )
      })

      test('should share one deadline across the token fetch and both attempts', async () => {
        fetch
          .mockResolvedValueOnce(mockFetchResponse({ ok: false, status: 401 }))
          .mockResolvedValueOnce(
            mockFetchResponse({ body: { results: [tynesideHouse] } })
          )

        await lookupAddresses(request, { postcode: 'NE4 7AR' })

        const signals = [
          getAccessToken.mock.calls[0][1].signal,
          fetch.mock.calls[0][1].signal,
          getAccessToken.mock.calls[1][1].signal,
          fetch.mock.calls[1][1].signal
        ]

        expect(signals[0]).toBeInstanceOf(AbortSignal)
        expect(new Set(signals).size).toBe(1)
      })

      test('should return an error when the retried request is also unauthorised', async () => {
        fetch.mockResolvedValue(mockFetchResponse({ ok: false, status: 401 }))

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result).toEqual({ results: [], error: true })
        expect(fetch).toHaveBeenCalledTimes(2)
        expect(request.logger.error).toHaveBeenCalledWith(
          { statusCode: 401 },
          'Address lookup request failed'
        )
      })

      test('should return an error when the token refresh fails after a 401', async () => {
        getAccessToken
          .mockResolvedValueOnce('a-stale-token')
          .mockResolvedValueOnce(null)

        fetch.mockResolvedValue(mockFetchResponse({ ok: false, status: 401 }))

        const result = await lookupAddresses(request, { postcode: 'NE4 7AR' })

        expect(result).toEqual({ results: [], error: true })
        expect(fetch).toHaveBeenCalledTimes(1)
      })
    })
  })
})
