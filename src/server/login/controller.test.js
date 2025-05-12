import { loginController } from './controller.js'

describe('loginController', () => {
  it('stores the profile in the server cache and redirects to "/"', async () => {
    const fakeProfile = {
      email: 'dimitri@alpha.com',
      roles: [],
      relationships: []
    }
    const fakeSessionId = 'sess-123'
    const mockCacheSet = jest.fn().mockResolvedValue()
    const request = {
      auth: {
        credentials: { profile: fakeProfile }
      },
      state: {
        session: fakeSessionId
      },
      server: {
        app: {
          cache: {
            set: mockCacheSet
          }
        }
      }
    }
    const h = {
      redirect: jest.fn().mockReturnValue('REDIRECTED')
    }

    const result = await loginController(request, h)

    expect(mockCacheSet).toHaveBeenCalledWith(fakeSessionId, {
      profile: fakeProfile
    })
    expect(h.redirect).toHaveBeenCalledWith('/')
    expect(result).toBe('REDIRECTED')
  })
})
