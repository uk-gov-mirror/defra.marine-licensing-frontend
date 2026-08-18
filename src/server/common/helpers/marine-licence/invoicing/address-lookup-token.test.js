import { vi } from 'vitest'
import {
  getAccessToken,
  resetTokenCache
} from '#src/server/common/helpers/marine-licence/invoicing/address-lookup-token.js'
import { createMockRequest } from '#src/server/test-helpers/mocks/helpers.js'
import { config } from '#src/config/config.js'

const CLIENT_SECRET = config.get('addressLookup').clientSecret

const mockTokenResponse = ({
  ok = true,
  status = 200,
  body = { access_token: 'a-token', expires_in: 3600, token_type: 'Bearer' }
} = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body)
})

describe('#oauthToken', () => {
  const request = createMockRequest()
  const { oauthTokenUrl, clientId, clientScope, redirectUri } =
    config.get('addressLookup')

  beforeEach(() => {
    resetTokenCache()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('should request a token with the client credentials grant', async () => {
    fetch.mockResolvedValue(mockTokenResponse())

    const signal = AbortSignal.timeout(1000)
    const token = await getAccessToken(request, { signal })

    expect(token).toBe('a-token')
    expect(fetch).toHaveBeenCalledWith(oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: expect.any(String),
      signal
    })

    const body = new URLSearchParams(fetch.mock.calls[0][1].body)

    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: CLIENT_SECRET,
      scope: clientScope,
      redirect_uri: redirectUri
    })
  })

  test('should reuse the cached token within its lifetime', async () => {
    fetch.mockResolvedValue(mockTokenResponse())

    await getAccessToken(request)
    const token = await getAccessToken(request)

    expect(token).toBe('a-token')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('should request a new token once the cached one has expired', async () => {
    vi.useFakeTimers()
    fetch
      .mockResolvedValueOnce(
        mockTokenResponse({
          body: { access_token: 'first-token', expires_in: 120 }
        })
      )
      .mockResolvedValueOnce(
        mockTokenResponse({
          body: { access_token: 'second-token', expires_in: 120 }
        })
      )

    expect(await getAccessToken(request)).toBe('first-token')

    // 120s lifetime less the 60s renewal skew
    vi.advanceTimersByTime(61_000)

    expect(await getAccessToken(request)).toBe('second-token')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('should bypass the cache when a refresh is forced', async () => {
    fetch
      .mockResolvedValueOnce(
        mockTokenResponse({ body: { access_token: 'first-token' } })
      )
      .mockResolvedValueOnce(
        mockTokenResponse({ body: { access_token: 'second-token' } })
      )

    await getAccessToken(request)
    const token = await getAccessToken(request, { forceRefresh: true })

    expect(token).toBe('second-token')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('should return null and log the status code when the token endpoint fails', async () => {
    fetch.mockResolvedValue(mockTokenResponse({ ok: false, status: 503 }))

    const token = await getAccessToken(request)

    expect(token).toBeNull()
    expect(request.logger.error).toHaveBeenCalledWith(
      { statusCode: 503 },
      'Address lookup token request failed'
    )
  })

  test('should return null when the response contains no access token', async () => {
    fetch.mockResolvedValue(mockTokenResponse({ body: { expires_in: 3600 } }))

    const token = await getAccessToken(request)

    expect(token).toBeNull()
    expect(request.logger.error).toHaveBeenCalledWith(
      { statusCode: 200 },
      'Address lookup token response did not contain an access token'
    )
  })

  test('should return null when the token request throws', async () => {
    const error = new Error('network down')
    fetch.mockRejectedValue(error)

    const token = await getAccessToken(request)

    expect(token).toBeNull()
    expect(request.logger.error).toHaveBeenCalledWith(
      error,
      'Address lookup token request threw an error'
    )
  })

  test('should not log the client secret or the access token', async () => {
    // Mint a real token first, so the token half of this assertion has teeth:
    // if the implementation logged the token anywhere, it would exist to be found.
    fetch.mockResolvedValueOnce(mockTokenResponse())
    expect(await getAccessToken(request)).toBe('a-token')

    // Then force a logged failure while a token is held.
    fetch.mockResolvedValueOnce(mockTokenResponse({ ok: false, status: 503 }))
    await getAccessToken(request, { forceRefresh: true })

    const logged = JSON.stringify([
      ...request.logger.error.mock.calls,
      ...request.logger.info.mock.calls
    ])

    expect(logged).not.toContain(CLIENT_SECRET)
    expect(logged).not.toContain('a-token')
    expect(request.logger.error).toHaveBeenCalledWith(
      { statusCode: 503 },
      'Address lookup token request failed'
    )
  })
})
