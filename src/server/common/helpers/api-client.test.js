import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import { callBackendApi, getFromBackend, postToBackend } from './api-client.js'

jest.mock('@hapi/wreck')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

describe('API Client', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      yar: {
        get: jest.fn().mockReturnValue({
          idToken: 'test-jwt-token'
        })
      },
      logger: {
        error: jest.fn()
      }
    }

    config.get.mockReturnValue('http://localhost:3001')
  })

  describe('callBackendApi', () => {
    it('should make authenticated request with JWT token', async () => {
      const mockResponse = {
        res: { statusCode: 200 },
        payload: { success: true }
      }
      Wreck.request.mockResolvedValue(mockResponse)

      const result = await callBackendApi(mockRequest, '/test-endpoint')

      expect(Wreck.request).toHaveBeenCalledWith(
        'GET',
        'http://localhost:3001/test-endpoint',
        {
          headers: {
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json'
          },
          json: true
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should throw error when user is not authenticated', async () => {
      mockRequest.yar.get.mockReturnValue(null)

      await expect(
        callBackendApi(mockRequest, '/test-endpoint')
      ).rejects.toThrow('User not authenticated - no JWT token available')
    })

    it('should throw error when backend URL is not configured', async () => {
      config.get.mockReturnValue(null)

      await expect(
        callBackendApi(mockRequest, '/test-endpoint')
      ).rejects.toThrow('Backend API URL not configured')
    })
  })

  describe('getFromBackend', () => {
    it('should make GET request', async () => {
      const mockResponse = {
        res: { statusCode: 200 },
        payload: { data: 'test' }
      }
      Wreck.request.mockResolvedValue(mockResponse)

      const result = await getFromBackend(mockRequest, '/test-endpoint')

      expect(Wreck.request).toHaveBeenCalledWith(
        'GET',
        'http://localhost:3001/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token'
          })
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('postToBackend', () => {
    it('should make POST request with payload', async () => {
      const mockResponse = { res: { statusCode: 201 }, payload: { id: 123 } }
      const testPayload = { name: 'test' }
      Wreck.request.mockResolvedValue(mockResponse)

      const result = await postToBackend(
        mockRequest,
        '/test-endpoint',
        testPayload
      )

      expect(Wreck.request).toHaveBeenCalledWith(
        'POST',
        'http://localhost:3001/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          payload: testPayload,
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token'
          })
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })
})
