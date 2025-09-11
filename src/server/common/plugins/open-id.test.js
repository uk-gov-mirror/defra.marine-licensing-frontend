import { jest } from '@jest/globals'
import { config } from '~/src/config/config.js'
import { createDefraIdStrategy } from '~/src/server/common/plugins/auth/defra-id-strategy.js'
import { createEntraIdStrategy } from '~/src/server/common/plugins/auth/entra-id-strategy.js'
import { createSessionStrategy } from '~/src/server/common/plugins/auth/session-strategy.js'

// Mock external dependencies that these strategy functions depend on
jest.mock('~/src/config/config.js')
jest.mock('~/src/server/common/plugins/auth/open-id-provider.js')
jest.mock('~/src/server/common/plugins/auth/validate.js')
jest.mock('~/src/server/common/helpers/session-cache/utils.js')
jest.mock('~/src/server/common/helpers/mcms-context/cache-mcms-context.js')

// Helper to create a mock server that tracks strategy calls
const createMockServer = () => ({
  auth: {
    strategy: jest.fn(),
    default: jest.fn()
  }
})

describe('Strategy Functions Integration Tests', () => {
  let mockServer
  const mockConfig = jest.mocked(config)

  beforeEach(() => {
    mockServer = createMockServer()
    jest.clearAllMocks()
  })

  describe('createDefraIdStrategy', () => {
    test('should register basic strategy when auth is disabled', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'defraId') return { authEnabled: false }
        return {}
      })

      await createDefraIdStrategy(mockServer)

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'defra-id',
        'basic',
        {
          validate: expect.any(Function)
        }
      )

      const validateFn = mockServer.auth.strategy.mock.calls[0][2].validate
      expect(validateFn()).toEqual({ isValid: true })
    })

    test('should try to register bell strategy when auth is enabled', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'defraId')
          return {
            authEnabled: true,
            clientId: 'test',
            clientSecret: 'test',
            redirectUrl: 'http://test',
            serviceId: 'test'
          }
        if (key === 'session.cookie') return { password: 'test', secure: true }
        return {}
      })

      // This will complete because openIdProvider mock returns undefined,
      // but the function will still call server.auth.strategy
      await createDefraIdStrategy(mockServer)

      // Verify it tried to register a bell strategy
      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'defra-id',
        'bell',
        expect.objectContaining({
          clientId: 'test',
          clientSecret: 'test',
          password: 'test',
          isSecure: true
        })
      )
    })
  })

  describe('createEntraIdStrategy', () => {
    test('should register basic strategy when auth is disabled', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'entraId') return { authEnabled: false }
        return {}
      })

      await createEntraIdStrategy(mockServer)

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'entra-id',
        'basic',
        {
          validate: expect.any(Function)
        }
      )

      const validateFn = mockServer.auth.strategy.mock.calls[0][2].validate
      expect(validateFn()).toEqual({ isValid: true })
    })
  })

  describe('createSessionStrategy', () => {
    test('should not register when neither auth is enabled', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'defraId') return { authEnabled: false }
        if (key === 'entraId') return { authEnabled: false }
        return {}
      })

      createSessionStrategy(mockServer)

      expect(mockServer.auth.strategy).not.toHaveBeenCalled()
    })

    test('should register session strategy when defraId auth is enabled', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'defraId') return { authEnabled: true }
        if (key === 'entraId') return { authEnabled: false }
        if (key === 'session.cookie')
          return { password: 'test', secure: true, ttl: 3600000 }
        return {}
      })

      createSessionStrategy(mockServer)

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'session',
        'cookie',
        expect.objectContaining({
          cookie: expect.objectContaining({
            name: 'userSession',
            password: 'test',
            isSecure: true,
            ttl: 3600000
          }),
          validate: expect.any(Function),
          redirectTo: expect.any(Function)
        })
      )

      expect(mockServer.auth.default).toHaveBeenCalledWith('session')
    })
  })
})
