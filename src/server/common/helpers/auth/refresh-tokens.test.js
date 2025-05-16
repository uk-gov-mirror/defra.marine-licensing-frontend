import fetch from 'node-fetch'
import { refreshTokens } from './refresh-tokens.js'
import { config } from '~/src/config/config.js'

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

describe('refreshTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('posts to the token endpoint and returns JSON on success', async () => {
    config.get.mockReturnValueOnce(
      'https://oidc/.well-known/openid-configuration'
    )
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        const response = await Promise.resolve({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600
        })
        return response
      }
    })

    const result = await refreshTokens('old-refresh')
    expect(fetch).toHaveBeenCalledWith(
      'https://oidc/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(URLSearchParams)
      })
    )
    expect(result).toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 3600
    })
  })

  it('throws if the response is not ok', async () => {
    config.get.mockReturnValueOnce(
      'https://oidc/.well-known/openid-configuration'
    )
    fetch.mockResolvedValueOnce({ ok: false, status: 502 })
    await expect(refreshTokens('r')).rejects.toThrow('refresh failed: 502')
  })
})
