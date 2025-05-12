import { v4 as uuidv4 } from 'uuid'
import { addSeconds } from 'date-fns'

import { authCallbackController } from './controller.js'

jest.mock('uuid', () => ({ v4: jest.fn() }))
jest.mock('date-fns', () => ({ addSeconds: jest.fn() }))

describe('authCallbackController', () => {
  let request
  let h

  beforeEach(() => {
    jest.clearAllMocks()

    // stub uuid and date-fns
    uuidv4.mockReturnValue('session-123')
    addSeconds.mockReturnValue('EXPIRES_AT')

    request = {
      auth: {
        isAuthenticated: true,
        credentials: {
          profile: { id: 'u1', email: 'u1@defra.com' },
          expiresIn: 3600
        }
      },
      server: {
        app: {
          cache: { set: jest.fn() }
        }
      },
      cookieAuth: {
        set: jest.fn()
      },
      logger: {
        info: jest.fn()
      },
      yar: {
        flash: jest.fn()
      }
    }

    h = {
      redirect: jest.fn((url) => ({ redirectedTo: url }))
    }
  })

  it('on success: sets session, cookie, logs, and redirects to referrer', async () => {
    request.yar.flash.mockReturnValue(['/defra/page'])

    const result = await authCallbackController.handler(request, h)

    expect(request.server.app.cache.set).toHaveBeenCalledWith('session-123', {
      profile: request.auth.credentials.profile,
      expiresAt: 'EXPIRES_AT'
    })

    expect(request.cookieAuth.set).toHaveBeenCalledWith({
      sessionId: 'session-123'
    })

    expect(request.logger.info).toHaveBeenCalledWith(
      'User successfully authenticated via Defra-ID'
    )

    expect(result).toEqual({ redirectedTo: '/defra/page' })
    expect(h.redirect).toHaveBeenCalledWith('/defra/page')

    expect(uuidv4).toHaveBeenCalled()
    expect(addSeconds).toHaveBeenCalledWith(expect.any(Date), 3600)
  })

  it('when no referrer flash, redirects to "/"', async () => {
    request.yar.flash.mockReturnValue([])

    const result = await authCallbackController.handler(request, h)

    expect(request.server.app.cache.set).toHaveBeenCalled()
    expect(request.cookieAuth.set).toHaveBeenCalled()
    expect(request.logger.info).toHaveBeenCalled()
    expect(result).toEqual({ redirectedTo: '/' })
    expect(h.redirect).toHaveBeenCalledWith('/')
  })

  it('when not authenticated, skips session & cookie & log, but still redirects', async () => {
    request.auth.isAuthenticated = false

    request.yar.flash.mockReturnValue(['/defra-fake'])

    const result = await authCallbackController.handler(request, h)

    expect(request.server.app.cache.set).not.toHaveBeenCalled()
    expect(request.cookieAuth.set).not.toHaveBeenCalled()
    expect(request.logger.info).not.toHaveBeenCalled()

    expect(result).toEqual({ redirectedTo: '/defra-fake' })
    expect(h.redirect).toHaveBeenCalledWith('/defra-fake')
  })
})
