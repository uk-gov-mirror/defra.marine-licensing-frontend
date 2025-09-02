import {
  uploadAndWaitController,
  UPLOAD_AND_WAIT_VIEW_ROUTE
} from '~/src/server/exemption/site-details/upload-and-wait/controller.js'
import * as cacheUtils from '~/src/server/common/helpers/session-cache/utils.js'
import * as cdpUploadService from '~/src/services/cdp-upload-service/index.js'
import * as fileValidationService from '~/src/services/file-validation/index.js'
import * as authenticatedRequests from '~/src/server/common/helpers/authenticated-requests.js'
import { mockExemption } from '~/src/server/test-helpers/mocks.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { config } from '~/src/config/config.js'

jest.mock('~/src/server/common/helpers/session-cache/utils.js')
jest.mock('~/src/services/cdp-upload-service/index.js')
jest.mock('~/src/services/file-validation/index.js')
jest.mock('~/src/server/common/helpers/authenticated-requests.js')
jest.mock('~/src/config/config.js')

// Mock logger configuration
jest.mock('~/src/server/common/helpers/logging/logger-options.js', () => ({
  loggerOptions: {
    enabled: true,
    ignorePaths: ['/health'],
    redact: {
      paths: []
    }
  }
}))

// Mock logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

// Test Data Factories
const createMockUploadConfig = (overrides = {}) => ({
  uploadId: 'test-upload-id',
  statusUrl: 'test-status-url',
  fileType: 'kml',
  ...overrides
})

const createMockStatusResponse = (status, overrides = {}) => ({
  status,
  filename: 'test.kml',
  fileSize: 1024,
  completedAt: '2025-01-01T00:00:00.000Z',
  ...(status === 'ready' && {
    s3Location: {
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      fileId: 'test-id',
      s3Url: 'test-url',
      checksumSha256: 'test-checksum'
    }
  }),
  ...overrides
})

const createMockExemption = (overrides = {}) => ({
  projectName: 'Test Project',
  siteDetails: { uploadConfig: createMockUploadConfig() },
  ...overrides
})

const createMockRequest = () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
})

const createMockGeoJsonResponse = () => ({
  statusCode: 200,
  payload: {
    message: 'success',
    value: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [1, 2] // Simple test coordinates
          }
        }
      ]
    }
  }
})

const createMockResponseHandler = () => ({
  view: jest.fn(),
  redirect: jest.fn()
})

// Mock Configuration Setup
const setupMockConfig = () => {
  config.get.mockImplementation((key) => {
    if (key === 'cdpUploader') {
      return { s3Bucket: 'test-bucket' }
    }
    // Return undefined for any other keys - will cause test to fail if something unexpected is accessed
    return undefined
  })
}

const expectSuccessfulFileProcessing = (spies, request) => {
  const { updateExemptionSiteDetailsBatchSpy } = spies

  // Verify batch update was called with all the required data including clearing upload config
  expect(updateExemptionSiteDetailsBatchSpy).toHaveBeenCalledWith(request, {
    uploadedFile: expect.any(Object),
    extractedCoordinates: expect.any(Array),
    geoJSON: expect.any(Object),
    featureCount: expect.any(Number),
    uploadConfig: null // Verify upload config is cleared as part of batch operation
  })
}

// Service Mock Setup Helpers
const setupMockServices = () => {
  const mockCdpService = {
    getStatus: jest.fn()
  }

  const mockFileValidationService = {
    validateFileExtension: jest.fn()
  }

  jest
    .spyOn(cdpUploadService, 'getCdpUploadService')
    .mockReturnValue(mockCdpService)
  jest
    .spyOn(fileValidationService, 'getFileValidationService')
    .mockReturnValue(mockFileValidationService)

  return { mockCdpService, mockFileValidationService }
}

const setupCacheSpies = () => {
  const getExemptionCacheSpy = jest
    .spyOn(cacheUtils, 'getExemptionCache')
    .mockReturnValue(mockExemption)

  const updateExemptionSiteDetailsSpy = jest
    .spyOn(cacheUtils, 'updateExemptionSiteDetails')
    .mockImplementation()

  const updateExemptionSiteDetailsBatchSpy = jest
    .spyOn(cacheUtils, 'updateExemptionSiteDetailsBatch')
    .mockImplementation()

  return {
    getExemptionCacheSpy,
    updateExemptionSiteDetailsSpy,
    updateExemptionSiteDetailsBatchSpy
  }
}

const setupAuthenticatedRequestSpy = () => {
  return jest
    .spyOn(authenticatedRequests, 'authenticatedPostRequest')
    .mockResolvedValue(createMockGeoJsonResponse())
}

// Error Testing Helpers
const expectRejectedStatusHandling = async (
  mockRequest,
  getExemptionCacheSpy,
  mockCdpService,
  updateExemptionSiteDetailsSpy,
  rejectedMessage,
  expectedErrorMessage,
  fileType = 'kml'
) => {
  // Given exemption with upload config and rejected status
  getExemptionCacheSpy.mockReturnValue(
    createMockExemption({
      siteDetails: { uploadConfig: createMockUploadConfig({ fileType }) }
    })
  )
  mockCdpService.getStatus.mockResolvedValue({
    status: 'rejected',
    message: rejectedMessage
  })

  const h = createMockResponseHandler()

  // When handler is called
  await uploadAndWaitController.handler(mockRequest, h)

  // Then expected error handling occurs
  expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
    mockRequest,
    'uploadError',
    {
      message: expectedErrorMessage,
      fieldName: 'file',
      fileType
    }
  )
  expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
    mockRequest,
    'uploadConfig',
    null
  )
  expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
}

const expectFileValidationFailure = async (
  mockRequest,
  getExemptionCacheSpy,
  mockCdpService,
  mockFileValidationService,
  updateExemptionSiteDetailsSpy,
  filename,
  fileType,
  allowedExtensions,
  errorMessage
) => {
  // Given exemption with upload config and ready status
  getExemptionCacheSpy.mockReturnValue(
    createMockExemption({
      siteDetails: { uploadConfig: createMockUploadConfig({ fileType }) }
    })
  )

  const statusResponse = createMockStatusResponse('ready', { filename })
  mockCdpService.getStatus.mockResolvedValue(statusResponse)

  // And failed file validation
  mockFileValidationService.validateFileExtension.mockReturnValue({
    isValid: false,
    extension: filename.split('.').pop(),
    errorMessage
  })

  const h = createMockResponseHandler()

  // When handler is called
  await uploadAndWaitController.handler(mockRequest, h)

  // Then file validation is performed
  expect(mockFileValidationService.validateFileExtension).toHaveBeenCalledWith(
    filename,
    allowedExtensions
  )

  // And error handling occurs
  expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
    mockRequest,
    'uploadError',
    {
      message: errorMessage,
      fieldName: 'file',
      fileType
    }
  )
  expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
    mockRequest,
    'uploadConfig',
    null
  )
  expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)

  // And uploaded file should not be stored when validation fails
  expect(updateExemptionSiteDetailsSpy).not.toHaveBeenCalledWith(
    mockRequest,
    'uploadedFile',
    expect.anything()
  )
}

describe('#uploadAndWait', () => {
  let getExemptionCacheSpy
  let updateExemptionSiteDetailsSpy
  let updateExemptionSiteDetailsBatchSpy
  let mockCdpService
  let mockFileValidationService
  let authenticatedPostRequestSpy

  beforeEach(() => {
    // Setup config after reset to ensure it's available
    setupMockConfig()

    const cacheSpies = setupCacheSpies()
    getExemptionCacheSpy = cacheSpies.getExemptionCacheSpy
    updateExemptionSiteDetailsSpy = cacheSpies.updateExemptionSiteDetailsSpy
    updateExemptionSiteDetailsBatchSpy =
      cacheSpies.updateExemptionSiteDetailsBatchSpy

    const services = setupMockServices()
    mockCdpService = services.mockCdpService
    mockFileValidationService = services.mockFileValidationService

    authenticatedPostRequestSpy = setupAuthenticatedRequestSpy()
  })

  describe('#uploadAndWaitController', () => {
    const mockRequest = createMockRequest()

    describe('when no upload config exists', () => {
      test('should redirect to CHOOSE_FILE_UPLOAD_TYPE', async () => {
        // Given no upload config exists
        getExemptionCacheSpy.mockReturnValue({})
        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then redirect to choose file upload type
        expect(h.redirect).toHaveBeenCalledWith(routes.CHOOSE_FILE_UPLOAD_TYPE)
      })
    })

    describe('when checking upload status', () => {
      test('should show waiting page when status is pending', async () => {
        // Given exemption with upload config and pending status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockResolvedValue(
          createMockStatusResponse('pending')
        )
        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then CDP service is called with correct parameters
        expect(mockCdpService.getStatus).toHaveBeenCalledWith(
          'test-upload-id',
          'test-status-url'
        )

        // And waiting page is displayed
        expect(h.view).toHaveBeenCalledWith(UPLOAD_AND_WAIT_VIEW_ROUTE, {
          pageTitle: 'Checking your file...',
          heading: 'Checking your file...',
          projectName: 'Test Project',
          isProcessing: true,
          pageRefreshTimeInSeconds: 2,
          filename: 'test.kml'
        })
      })

      test('should show waiting page when status is scanning', async () => {
        // Given exemption with upload config and scanning status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockResolvedValue(
          createMockStatusResponse('scanning')
        )
        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then waiting page is displayed
        expect(h.view).toHaveBeenCalledWith(UPLOAD_AND_WAIT_VIEW_ROUTE, {
          pageTitle: 'Checking your file...',
          heading: 'Checking your file...',
          projectName: 'Test Project',
          isProcessing: true,
          pageRefreshTimeInSeconds: 2,
          filename: 'test.kml'
        })
      })

      test('should redirect to CHOOSE_FILE_UPLOAD_TYPE for unknown status', async () => {
        // Given exemption with upload config and unknown status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockResolvedValue({
          status: 'unknown',
          filename: 'test.kml'
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then warning is logged
        expect(mockRequest.logger.warn).toHaveBeenCalledWith(
          {
            uploadId: 'test-upload-id',
            status: 'unknown'
          },
          'Unknown upload status'
        )

        // And user is redirected to choose file upload type
        expect(h.redirect).toHaveBeenCalledWith(routes.CHOOSE_FILE_UPLOAD_TYPE)
      })
    })

    describe('when file upload is ready', () => {
      describe('with valid KML file', () => {
        test('should process file and redirect to review page', async () => {
          // Given exemption with upload config and ready status
          getExemptionCacheSpy.mockReturnValue(createMockExemption())
          const statusResponse = createMockStatusResponse('ready')
          mockCdpService.getStatus.mockResolvedValue(statusResponse)

          // And successful file validation
          mockFileValidationService.validateFileExtension.mockReturnValue({
            isValid: true,
            extension: 'kml',
            errorMessage: null
          })

          const h = createMockResponseHandler()

          // When handler is called
          await uploadAndWaitController.handler(mockRequest, h)

          // Then file validation is performed
          expect(
            mockFileValidationService.validateFileExtension
          ).toHaveBeenCalledWith('test.kml', ['kml'])

          // And geo-parser API is called
          expect(authenticatedPostRequestSpy).toHaveBeenCalledWith(
            mockRequest,
            '/geo-parser/extract',
            {
              s3Bucket: 'test-bucket',
              s3Key: 'test-key',
              fileType: 'kml'
            }
          )

          // And file processing data is stored correctly
          expectSuccessfulFileProcessing(
            {
              updateExemptionSiteDetailsSpy,
              updateExemptionSiteDetailsBatchSpy
            },
            mockRequest
          )

          // And user is redirected to review page
          expect(h.redirect).toHaveBeenCalledWith(routes.REVIEW_SITE_DETAILS)
        })
      })

      describe('with valid Shapefile', () => {
        test('should process shapefile and redirect to review page', async () => {
          // Given exemption with shapefile upload config
          const shapefileUploadConfig = createMockUploadConfig({
            fileType: 'shapefile'
          })
          getExemptionCacheSpy.mockReturnValue(
            createMockExemption({
              siteDetails: { uploadConfig: shapefileUploadConfig }
            })
          )

          const statusResponse = createMockStatusResponse('ready', {
            filename: 'coordinates.zip'
          })
          mockCdpService.getStatus.mockResolvedValue(statusResponse)

          // And successful shapefile validation
          mockFileValidationService.validateFileExtension.mockReturnValue({
            isValid: true,
            extension: 'zip',
            errorMessage: null
          })

          const h = createMockResponseHandler()

          // When handler is called
          await uploadAndWaitController.handler(mockRequest, h)

          // Then file validation is performed with zip extension
          expect(
            mockFileValidationService.validateFileExtension
          ).toHaveBeenCalledWith('coordinates.zip', ['zip'])

          // And geo-parser API is called with shapefile type
          expect(authenticatedPostRequestSpy).toHaveBeenCalledWith(
            mockRequest,
            '/geo-parser/extract',
            {
              s3Bucket: 'test-bucket',
              s3Key: 'test-key',
              fileType: 'shapefile'
            }
          )

          // And file processing data is stored correctly
          expectSuccessfulFileProcessing(
            {
              updateExemptionSiteDetailsSpy,
              updateExemptionSiteDetailsBatchSpy
            },
            mockRequest
          )

          // And user is redirected to review page
          expect(h.redirect).toHaveBeenCalledWith(routes.REVIEW_SITE_DETAILS)
        })
      })
    })

    describe('when file validation fails', () => {
      /* eslint-disable jest/expect-expect */
      test('should redirect to file upload with error for wrong extension', async () => {
        await expectFileValidationFailure(
          mockRequest,
          getExemptionCacheSpy,
          mockCdpService,
          mockFileValidationService,
          updateExemptionSiteDetailsSpy,
          'document.pdf',
          'kml',
          ['kml'],
          'The selected file must be a KML file'
        )
      })

      /* eslint-disable jest/expect-expect */
      test('should handle unknown file type in getAllowedExtensions default case', async () => {
        await expectFileValidationFailure(
          mockRequest,
          getExemptionCacheSpy,
          mockCdpService,
          mockFileValidationService,
          updateExemptionSiteDetailsSpy,
          'test.unknown',
          'unknown',
          [],
          'The selected file could not be uploaded – try again'
        )
      })
    })

    describe('when upload is rejected', () => {
      /* eslint-disable jest/expect-expect */
      test('should redirect to file upload with virus error message', async () => {
        await expectRejectedStatusHandling(
          mockRequest,
          getExemptionCacheSpy,
          mockCdpService,
          updateExemptionSiteDetailsSpy,
          'The selected file contains a virus',
          'The selected file contains a virus'
        )
      })

      test('should handle error status the same as rejected status', async () => {
        // Given exemption with upload config and error status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockResolvedValue({
          status: 'error',
          message: 'Processing failed'
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then error is set in cache
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadError',
          {
            message: 'The selected file could not be uploaded – try again',
            fieldName: 'file',
            fileType: 'kml'
          }
        )

        // And upload config is cleared
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )

        // And user is redirected to file upload
        expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
      })

      /* eslint-disable jest/expect-expect */
      test('should handle different error message types correctly', async () => {
        const testCases = [
          { message: 'file is empty', expected: 'The selected file is empty' },
          {
            message: 'file must be smaller than 50MB',
            expected: 'The selected file must be smaller than 50 MB'
          },
          {
            message: 'must be a kml file',
            expected: 'The selected file must be a KML file'
          },
          {
            message: 'Select a file to upload',
            expected: 'Select a file to upload'
          },
          {
            message: 'unknown error',
            expected: 'The selected file could not be uploaded – try again'
          }
        ]

        for (const testCase of testCases) {
          await expectRejectedStatusHandling(
            mockRequest,
            getExemptionCacheSpy,
            mockCdpService,
            updateExemptionSiteDetailsSpy,
            testCase.message,
            testCase.expected
          )
        }
      })

      /* eslint-disable jest/expect-expect */
      test('should handle unknown file type message correctly', async () => {
        await expectRejectedStatusHandling(
          mockRequest,
          getExemptionCacheSpy,
          mockCdpService,
          updateExemptionSiteDetailsSpy,
          'must be a foo file',
          'The selected file could not be uploaded – try again',
          'foo'
        )
      })

      /* eslint-disable jest/expect-expect */
      test('should handle shapefile error message correctly', async () => {
        await expectRejectedStatusHandling(
          mockRequest,
          getExemptionCacheSpy,
          mockCdpService,
          updateExemptionSiteDetailsSpy,
          'must be a shapefile',
          'The selected file must be a Shapefile',
          'shapefile'
        )
      })
    })

    describe('when geo-parser API fails', () => {
      test('should handle geo-parser API errors gracefully', async () => {
        // Given exemption with upload config and ready status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        const statusResponse = createMockStatusResponse('ready')
        mockCdpService.getStatus.mockResolvedValue(statusResponse)

        // And successful file validation
        mockFileValidationService.validateFileExtension.mockReturnValue({
          isValid: true,
          extension: 'kml',
          errorMessage: null
        })

        // But geo-parser API fails
        authenticatedPostRequestSpy.mockRejectedValue(
          new Error('Geo-parser service unavailable')
        )

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then geo-parser API is called
        expect(authenticatedPostRequestSpy).toHaveBeenCalledWith(
          mockRequest,
          '/geo-parser/extract',
          {
            s3Bucket: 'test-bucket',
            s3Key: 'test-key',
            fileType: 'kml'
          }
        )

        // And error is logged
        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          {
            error: 'Geo-parser service unavailable',
            filename: 'test.kml',
            fileType: 'kml'
          },
          'Failed to extract coordinates from uploaded file'
        )

        // And generic error is set in cache
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadError',
          {
            message: 'The selected file could not be processed – try again',
            fieldName: 'file',
            fileType: 'kml'
          }
        )

        // And upload config is cleared
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )

        // And user is redirected to file upload
        expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
      })

      test('should handle geo-parser API returning invalid response', async () => {
        // Given exemption with upload config and ready status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        const statusResponse = createMockStatusResponse('ready')
        mockCdpService.getStatus.mockResolvedValue(statusResponse)

        // And successful file validation
        mockFileValidationService.validateFileExtension.mockReturnValue({
          isValid: true,
          extension: 'kml',
          errorMessage: null
        })

        // But geo-parser API returns invalid response
        authenticatedPostRequestSpy.mockResolvedValue({
          statusCode: 400,
          payload: {
            error: 'Invalid file format'
          }
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then error handling occurs
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadError',
          {
            message: 'The selected file could not be processed – try again',
            fieldName: 'file',
            fileType: 'kml'
          }
        )

        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )
        expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
      })

      test('should handle geo-parser API returning unsuccessful response', async () => {
        // Given exemption with upload config and ready status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        const statusResponse = createMockStatusResponse('ready')
        mockCdpService.getStatus.mockResolvedValue(statusResponse)

        // And successful file validation
        mockFileValidationService.validateFileExtension.mockReturnValue({
          isValid: true,
          extension: 'kml',
          errorMessage: null
        })

        // But geo-parser API returns unsuccessful response
        authenticatedPostRequestSpy.mockResolvedValue({
          statusCode: 200,
          payload: {
            message: 'error',
            error: 'Could not parse file'
          }
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then error handling occurs
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadError',
          {
            message: 'The selected file could not be processed – try again',
            fieldName: 'file',
            fileType: 'kml'
          }
        )

        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )
        expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
      })

      test('should handle geo-parser API returning invalid GeoJSON structure', async () => {
        // Given exemption with upload config and ready status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        const statusResponse = createMockStatusResponse('ready')
        mockCdpService.getStatus.mockResolvedValue(statusResponse)

        // And successful file validation
        mockFileValidationService.validateFileExtension.mockReturnValue({
          isValid: true,
          extension: 'kml',
          errorMessage: null
        })

        // But geo-parser API returns response with invalid GeoJSON
        authenticatedPostRequestSpy.mockResolvedValue({
          statusCode: 200,
          payload: {
            message: 'success',
            value: {
              type: 'FeatureCollection'
              // Missing features array
            }
          }
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then error handling occurs
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadError',
          {
            message: 'The selected file could not be processed – try again',
            fieldName: 'file',
            fileType: 'kml'
          }
        )

        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )
        expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
      })
    })

    describe('when service errors occur', () => {
      test('should handle CDP service errors gracefully', async () => {
        // Given exemption with upload config and CDP service error
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockRejectedValue(
          new Error('Service unavailable')
        )

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then error is logged
        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          {
            error: 'Service unavailable',
            uploadId: 'test-upload-id'
          },
          'Failed to check upload status'
        )

        // And upload config is cleared
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )

        // And user is redirected to choose file upload type
        expect(h.redirect).toHaveBeenCalledWith(routes.CHOOSE_FILE_UPLOAD_TYPE)
      })
    })

    describe('logging behavior', () => {
      test('should log debug information on successful status check', async () => {
        // Given exemption with upload config and pending status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockResolvedValue(
          createMockStatusResponse('pending')
        )

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then debug information is logged (behavior, not exact count)
        expect(mockRequest.logger.debug).toHaveBeenCalled()
      })

      test('should log successful coordinate extraction info', async () => {
        // Given exemption with upload config and ready status
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        const statusResponse = createMockStatusResponse('ready')
        mockCdpService.getStatus.mockResolvedValue(statusResponse)

        // And successful file validation
        mockFileValidationService.validateFileExtension.mockReturnValue({
          isValid: true,
          extension: 'kml',
          errorMessage: null
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then info logging occurs for successful extraction
        expect(mockRequest.logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            featureCount: expect.any(Number),
            coordinateCount: expect.any(Number)
          }),
          'Successfully extracted coordinates'
        )

        // And completion logging occurs
        expect(mockRequest.logger.info).toHaveBeenCalledWith(
          'File upload and coordinate extraction completed successfully',
          expect.objectContaining({
            filename: 'test.kml',
            fileType: 'kml',
            featureCount: expect.any(Number)
          })
        )
      })
    })

    describe('edge cases', () => {
      test('should handle missing s3Location in status response', async () => {
        // Given exemption with upload config and ready status without s3Location
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        const statusResponse = createMockStatusResponse('ready')
        delete statusResponse.s3Location
        mockCdpService.getStatus.mockResolvedValue(statusResponse)

        // And successful file validation
        mockFileValidationService.validateFileExtension.mockReturnValue({
          isValid: true,
          extension: 'kml',
          errorMessage: null
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then error handling occurs due to missing s3Location
        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadError',
          {
            message: 'The selected file could not be processed – try again',
            fieldName: 'file',
            fileType: 'kml'
          }
        )

        expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
          mockRequest,
          'uploadConfig',
          null
        )
        expect(h.redirect).toHaveBeenCalledWith(routes.FILE_UPLOAD)
      })

      test('should handle empty filename in status response', async () => {
        // Given exemption with upload config and status with empty filename
        getExemptionCacheSpy.mockReturnValue(createMockExemption())
        mockCdpService.getStatus.mockResolvedValue({
          status: 'pending',
          filename: ''
        })

        const h = createMockResponseHandler()

        // When handler is called
        await uploadAndWaitController.handler(mockRequest, h)

        // Then waiting page is still displayed (handles empty filename gracefully)
        expect(h.view).toHaveBeenCalledWith(UPLOAD_AND_WAIT_VIEW_ROUTE, {
          pageTitle: 'Checking your file...',
          heading: 'Checking your file...',
          projectName: 'Test Project',
          isProcessing: true,
          pageRefreshTimeInSeconds: 2,
          filename: ''
        })
      })
    })
  })
})
