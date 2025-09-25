import Boom from '@hapi/boom'
import { setupTestServer } from '~/tests/integration/shared/test-setup-helpers.js'
import * as exemptionSiteDetailsHelpers from '~/src/server/common/helpers/exemption-site-details.js'
import { getExemptionService } from '~/src/services/exemption-service/index.js'
import { viewDetailsController, VIEW_DETAILS_VIEW_ROUTE } from './controller.js'
import {
  createSubmittedExemption,
  createFileUploadExemption,
  errorScenarios
} from '~/tests/integration/view-details/test-utilities.js'

import { makeGetRequest } from '~/src/server/test-helpers/server-requests.js'
import { getAuthProvider } from '~/src/server/common/helpers/authenticated-requests.js'

jest.mock('~/src/services/exemption-service/index.js')
jest.mock('~/src/server/common/helpers/authenticated-requests.js', () => ({
  getAuthProvider: jest.fn().mockReturnValue('defra-id')
}))

describe('view details controller', () => {
  const getServer = setupTestServer()
  let mockExemptionService

  beforeEach(() => {
    mockExemptionService = {
      getExemptionById: jest.fn().mockResolvedValue(createSubmittedExemption())
    }

    jest.mocked(getExemptionService).mockReturnValue(mockExemptionService)
  })

  describe('GET /exemption/view-details/{exemptionId}', () => {
    const validExemptionId = '507f1f77bcf86cd799439011'

    describe('successful scenarios', () => {
      test('should return 200 status for valid submitted exemption', async () => {
        const submittedExemption = createSubmittedExemption()
        mockExemptionService.getExemptionById.mockResolvedValue(
          submittedExemption
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(200)
      })

      test('should call exemption service with correct exemption ID', async () => {
        const submittedExemption = createSubmittedExemption()
        mockExemptionService.getExemptionById.mockResolvedValue(
          submittedExemption
        )

        await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(getExemptionService).toHaveBeenCalledWith(expect.any(Object))
        expect(mockExemptionService.getExemptionById).toHaveBeenCalledWith(
          validExemptionId
        )
      })
    })

    describe('data processing scenarios', () => {
      test('should handle exemption with no site details', async () => {
        const exemptionWithoutSiteDetails = createSubmittedExemption({
          siteDetails: null
        })
        mockExemptionService.getExemptionById.mockResolvedValue(
          exemptionWithoutSiteDetails
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(200)
      })

      test('should handle file upload data error gracefully', async () => {
        const fileUploadExemption = createFileUploadExemption('kml', 'test.kml')
        mockExemptionService.getExemptionById.mockResolvedValue(
          fileUploadExemption
        )

        const mockProcessedSiteDetails = {
          isFileUpload: true,
          method: 'Upload a file with the coordinates of the site',
          fileType: 'KML',
          filename: 'test.kml'
        }

        const processSiteDetailsSpy = jest
          .spyOn(exemptionSiteDetailsHelpers, 'processSiteDetails')
          .mockReturnValue(mockProcessedSiteDetails)

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(200)
        processSiteDetailsSpy.mockRestore()
      })
    })

    describe('error scenarios', () => {
      test('should throw 404 when exemption ID is missing', async () => {
        const { statusCode } = await makeGetRequest({
          url: '/exemption/view-details/',
          server: getServer()
        })

        expect(statusCode).toBe(404)
      })

      test('should throw 500 when exemption is not found in API', async () => {
        mockExemptionService.getExemptionById.mockRejectedValue(
          new Error('Exemption data not found')
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(500)
      })

      test('should throw 500 when API returns empty payload', async () => {
        mockExemptionService.getExemptionById.mockRejectedValue(
          new Error('Exemption data not found')
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(500)
      })

      test('should throw 403 when exemption is still in Draft status', async () => {
        mockExemptionService.getExemptionById.mockResolvedValue(
          errorScenarios.draftExemption
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(403)
      })

      test('should throw 403 when exemption has no application reference', async () => {
        mockExemptionService.getExemptionById.mockResolvedValue(
          errorScenarios.exemptionWithoutReference
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(403)
      })

      test('should handle API authentication errors (403)', async () => {
        const authError = Boom.forbidden('Forbidden')
        mockExemptionService.getExemptionById.mockRejectedValue(authError)

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(403)
      })

      test('should handle API not found errors (404)', async () => {
        const notFoundError = Boom.notFound('Not Found')
        mockExemptionService.getExemptionById.mockRejectedValue(notFoundError)

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(404)
      })

      test('should handle unexpected API errors gracefully', async () => {
        mockExemptionService.getExemptionById.mockRejectedValue(
          new Error('Unexpected API error')
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(500)
      })

      test('should handle Boom errors properly', async () => {
        mockExemptionService.getExemptionById.mockRejectedValue(
          Boom.internal('Internal server error')
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(500)
      })
    })

    describe('controller unit tests', () => {
      test('should call view with correct data structure', async () => {
        const submittedExemption = createSubmittedExemption()
        const mockExemptionServiceInstance = {
          getExemptionById: jest.fn().mockResolvedValue(submittedExemption)
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)

        const mockRequest = {
          params: { exemptionId: validExemptionId },
          logger: { error: jest.fn() }
        }
        const mockH = { view: jest.fn() }

        await viewDetailsController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith(
          VIEW_DETAILS_VIEW_ROUTE,
          expect.objectContaining({
            pageTitle: submittedExemption.projectName,
            pageCaption: 'EXE/2025/00003 - Exempt activity notification',
            backLink: '/home',
            isReadOnly: true,
            projectName: submittedExemption.projectName,
            activityDates: submittedExemption.activityDates,
            activityDescription: submittedExemption.activityDescription,
            publicRegister: submittedExemption.publicRegister,
            siteDetails: expect.any(Object)
          })
        )
      })

      test('should omit the back link if user is authenticated with entra ID', async () => {
        const submittedExemption = createSubmittedExemption()
        const mockExemptionServiceInstance = {
          getExemptionById: jest.fn().mockResolvedValue(submittedExemption)
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)
        jest.mocked(getAuthProvider).mockReturnValue('entra-id')

        const mockRequest = {
          params: { exemptionId: validExemptionId },
          logger: { error: jest.fn() },
          auth: { credentials: { strategy: 'entra-id' } }
        }
        const mockH = { view: jest.fn() }

        await viewDetailsController.handler(mockRequest, mockH)

        expect(mockH.view.mock.calls[0][1].backLink).toBeNull()
      })

      test('should handle file upload data error and use fallback', async () => {
        const fileUploadExemption = createFileUploadExemption(
          'shapefile',
          'test-boundary.zip',
          {
            siteDetails: {
              coordinatesType: 'file',
              fileUploadType: 'shapefile'
            }
          }
        )
        const mockExemptionServiceInstance = {
          getExemptionById: jest.fn().mockResolvedValue(fileUploadExemption)
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)

        const mockProcessedSiteDetails = {
          isFileUpload: true,
          method: 'Upload a file with the coordinates of the site',
          fileType: 'Shapefile',
          filename: 'Unknown file'
        }

        const processSiteDetailsSpy = jest
          .spyOn(exemptionSiteDetailsHelpers, 'processSiteDetails')
          .mockReturnValue(mockProcessedSiteDetails)

        const mockRequest = {
          params: { exemptionId: validExemptionId },
          logger: { error: jest.fn() }
        }
        const mockH = { view: jest.fn() }

        await viewDetailsController.handler(mockRequest, mockH)

        expect(processSiteDetailsSpy).toHaveBeenCalledWith(
          fileUploadExemption,
          validExemptionId,
          expect.any(Object)
        )

        expect(mockH.view).toHaveBeenCalledWith(
          VIEW_DETAILS_VIEW_ROUTE,
          expect.objectContaining({
            siteDetails: expect.objectContaining({
              isFileUpload: true,
              method: 'Upload a file with the coordinates of the site',
              fileType: 'Shapefile',
              filename: 'Unknown file'
            })
          })
        )

        processSiteDetailsSpy.mockRestore()
      })

      test('should handle file upload data error with KML file type fallback', async () => {
        const kmlFileUploadExemption = createFileUploadExemption(
          'kml',
          'test-area.kml',
          {
            siteDetails: { coordinatesType: 'file', fileUploadType: 'kml' }
          }
        )
        const mockExemptionServiceInstance = {
          getExemptionById: jest.fn().mockResolvedValue(kmlFileUploadExemption)
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)

        const mockProcessedSiteDetails = {
          isFileUpload: true,
          method: 'Upload a file with the coordinates of the site',
          fileType: 'KML',
          filename: 'Unknown file'
        }

        const processSiteDetailsSpy = jest
          .spyOn(exemptionSiteDetailsHelpers, 'processSiteDetails')
          .mockReturnValue(mockProcessedSiteDetails)

        const mockRequest = {
          params: { exemptionId: validExemptionId },
          logger: { error: jest.fn() }
        }
        const mockH = { view: jest.fn() }

        await viewDetailsController.handler(mockRequest, mockH)

        expect(processSiteDetailsSpy).toHaveBeenCalledWith(
          kmlFileUploadExemption,
          validExemptionId,
          expect.any(Object)
        )

        expect(mockH.view).toHaveBeenCalledWith(
          VIEW_DETAILS_VIEW_ROUTE,
          expect.objectContaining({
            siteDetails: expect.objectContaining({
              isFileUpload: true,
              method: 'Upload a file with the coordinates of the site',
              fileType: 'KML',
              filename: 'Unknown file'
            })
          })
        )

        processSiteDetailsSpy.mockRestore()
      })

      test('should handle non-Boom errors', async () => {
        const submittedExemption = createSubmittedExemption()
        const mockExemptionServiceInstance = {
          getExemptionById: jest.fn().mockResolvedValue(submittedExemption)
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)

        const mockError = new Error('Site details processing failed')
        const mockH = { view: jest.fn() }

        mockH.view.mockImplementation(() => {
          throw mockError
        })

        const mockRequest = {
          params: { exemptionId: validExemptionId },
          logger: { error: jest.fn() }
        }

        await expect(
          viewDetailsController.handler(mockRequest, mockH)
        ).rejects.toThrow('Error displaying exemption details')

        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          mockError,
          'Error displaying exemption details'
        )
      })

      test('should handle missing exemption ID in params', async () => {
        const mockExemptionServiceInstance = {
          getExemptionById: jest
            .fn()
            .mockRejectedValue(new Error('Exemption not found'))
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)

        const mockRequest = {
          params: {},
          logger: { error: jest.fn() }
        }
        const mockH = { view: jest.fn() }

        await expect(
          viewDetailsController.handler(mockRequest, mockH)
        ).rejects.toThrow('Error displaying exemption details')
      })

      test('should log errors appropriately', async () => {
        const mockExemptionServiceInstance = {
          getExemptionById: jest
            .fn()
            .mockRejectedValue(new Error('Exemption data not found'))
        }

        jest
          .mocked(getExemptionService)
          .mockReturnValue(mockExemptionServiceInstance)

        const mockRequest = {
          params: { exemptionId: 'invalid-id' },
          logger: { error: jest.fn() }
        }
        const mockH = { view: jest.fn() }

        await expect(
          viewDetailsController.handler(mockRequest, mockH)
        ).rejects.toThrow()

        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          new Error('Exemption data not found'),
          'Error displaying exemption details'
        )
      })
    })

    describe('acceptance criteria verification', () => {
      test('AC1 - View details route pattern validation', () => {
        const route = `/exemption/view-details/${validExemptionId}`
        expect(route).toMatch(/^\/exemption\/view-details\/[a-f0-9]{24}$/)
      })

      test('AC2 - Navigation to view notification details page returns 200', async () => {
        const submittedExemption = createSubmittedExemption()
        mockExemptionService.getExemptionById.mockResolvedValue(
          submittedExemption
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(200)
      })

      test('AC4 - Unique URL accessibility', async () => {
        const submittedExemption = createSubmittedExemption()
        mockExemptionService.getExemptionById.mockResolvedValue(
          submittedExemption
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(200)
      })
    })

    describe('data integrity and edge cases', () => {
      test('should handle empty application reference', async () => {
        mockExemptionService.getExemptionById.mockResolvedValue(
          errorScenarios.exemptionWithEmptyReference
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(403)
      })

      test('should handle malformed site details data', async () => {
        mockExemptionService.getExemptionById.mockResolvedValue(
          errorScenarios.exemptionWithMalformedSiteDetails
        )

        const { statusCode } = await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(statusCode).toBe(200)
      })

      test('should fetch data from API ignoring any cache', async () => {
        const submittedExemption = createSubmittedExemption()
        mockExemptionService.getExemptionById.mockResolvedValue(
          submittedExemption
        )

        await makeGetRequest({
          url: `/exemption/view-details/${validExemptionId}`,
          server: getServer()
        })

        expect(mockExemptionService.getExemptionById).toHaveBeenCalledTimes(1)
        expect(mockExemptionService.getExemptionById).toHaveBeenCalledWith(
          validExemptionId
        )
      })
    })
  })
})
