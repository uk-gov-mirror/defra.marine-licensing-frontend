import Wreck from '@hapi/wreck'
import { refreshTokens } from './refresh-tokens.js'
import { config } from '~/src/config/config.js'

jest.mock('@hapi/wreck')
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
    Wreck.post.mockResolvedValueOnce({
      res: { statusCode: 200 },
      payload: Buffer.from(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600
        })
      )
    })

    const result = await refreshTokens('old-refresh')
    expect(Wreck.post).toHaveBeenCalledWith(
      'https://oidc/token',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        payload: expect.any(String)
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
    Wreck.post.mockResolvedValueOnce({
      res: { statusCode: 502 },
      payload: Buffer.from('{}')
    })
    await expect(refreshTokens('r')).rejects.toThrow('refresh failed: 502')
  })
})
