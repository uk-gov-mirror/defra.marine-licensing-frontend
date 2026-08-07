import { vi } from 'vitest'

import { authenticatedPostRequest } from '#src/server/common/helpers/authenticated-requests.js'
import {
  getMarineLicenceCache,
  setMarineLicenceCache,
  clearMarineLicenceCache
} from '#src/server/common/helpers/marine-licence/session-cache/utils.js'
import {
  routes,
  marineLicenceRoutes
} from '#src/server/common/constants/routes.js'
import { MARINE_LICENCE_TYPE } from '#src/server/common/constants/marine-licence.js'
import { PROJECT_STATUS } from '#src/server/common/constants/projects.js'
import * as marineLicenceServiceModule from '#src/services/marine-licence-service/index.js'

import {
  withdrawMarineLicenceController,
  withdrawMarineLicenceSelectController,
  withdrawMarineLicenceSubmitController,
  TERMS_AND_CONDITIONS_LINK
} from './controller.js'

vi.mock('~/src/server/common/helpers/authenticated-requests.js')
vi.mock('~/src/server/common/helpers/marine-licence/session-cache/utils.js')

describe('#withdrawMarineLicence', () => {
  let mockRequest
  let mockH
  let mockGetMarineLicenceById

  const mockedAuthenticatedPostRequest = vi.mocked(authenticatedPostRequest)
  const mockedGetMarineLicenceCache = vi.mocked(getMarineLicenceCache)
  const mockedSetMarineLicenceCache = vi.mocked(setMarineLicenceCache)
  const mockedClearMarineLicenceCache = vi.mocked(clearMarineLicenceCache)

  const marineLicenceId = 'test-project-id'

  const submittedMarineLicence = {
    id: marineLicenceId,
    projectName: 'Worthing pier repairs',
    status: PROJECT_STATUS.SUBMITTED
  }

  beforeEach(() => {
    mockRequest = {
      logger: { error: vi.fn(), info: vi.fn() },
      state: {}
    }

    mockH = {
      view: vi.fn().mockReturnValue('view-response'),
      redirect: vi.fn().mockReturnValue('redirect-response')
    }

    mockGetMarineLicenceById = vi.fn()
    vi.spyOn(
      marineLicenceServiceModule,
      'getMarineLicenceService'
    ).mockReturnValue({ getMarineLicenceById: mockGetMarineLicenceById })
  })

  describe('withdrawMarineLicenceController', () => {
    it('should render the withdraw confirmation page with project details', async () => {
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })
      mockGetMarineLicenceById.mockResolvedValue(submittedMarineLicence)

      const result = await withdrawMarineLicenceController.handler(
        mockRequest,
        mockH
      )

      expect(mockGetMarineLicenceById).toHaveBeenCalledWith(marineLicenceId)
      expect(mockH.view).toHaveBeenCalledWith('marine-licence/withdraw/index', {
        pageTitle: 'Are you sure you want to withdraw this application?',
        heading: 'Are you sure you want to withdraw this application?',
        projectName: 'Worthing pier repairs',
        marineLicenceType: MARINE_LICENCE_TYPE,
        marineLicenceId,
        termsAndConditionsLink: TERMS_AND_CONDITIONS_LINK,
        backLink: routes.DASHBOARD,
        cancelLink: routes.DASHBOARD,
        routes
      })
      expect(result).toBe('view-response')
    })

    it('should throw 404 if marine licence is not found in cache', async () => {
      mockedGetMarineLicenceCache.mockReturnValue({ id: undefined })

      await expect(
        withdrawMarineLicenceController.handler(mockRequest, mockH)
      ).rejects.toThrow('Marine licence not found')
    })

    it.each([
      PROJECT_STATUS.DRAFT,
      PROJECT_STATUS.TRANSFERRED,
      PROJECT_STATUS.WITHDRAWN
    ])('should redirect to dashboard when status is %s', async (status) => {
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })
      mockGetMarineLicenceById.mockResolvedValue({
        ...submittedMarineLicence,
        status
      })

      const result = await withdrawMarineLicenceController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.view).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })

    it('should redirect to dashboard if the project is not found', async () => {
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })
      mockGetMarineLicenceById.mockResolvedValue(null)

      const result = await withdrawMarineLicenceController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })

    it('should redirect to dashboard if the API call fails', async () => {
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })
      mockGetMarineLicenceById.mockRejectedValue(new Error('API Error'))

      const result = await withdrawMarineLicenceController.handler(
        mockRequest,
        mockH
      )

      expect(mockRequest.logger.error).toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })
  })

  describe('withdrawMarineLicenceSelectController', () => {
    it('should clear cache, set marine licence ID in cache, and redirect to withdraw page', async () => {
      mockRequest.params = { marineLicenceId }

      const result = await withdrawMarineLicenceSelectController.handler(
        mockRequest,
        mockH
      )

      expect(mockedClearMarineLicenceCache).toHaveBeenCalledWith(
        mockRequest,
        mockH
      )
      expect(mockedSetMarineLicenceCache).toHaveBeenCalledWith(
        mockRequest,
        mockH,
        { id: marineLicenceId }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        marineLicenceRoutes.MARINE_LICENCE_WITHDRAW
      )
      expect(result).toBe('redirect-response')
    })
  })

  describe('withdrawMarineLicenceSubmitController', () => {
    it('should withdraw the marine licence and redirect to dashboard when IDs match', async () => {
      mockRequest.payload = { marineLicenceId }
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })

      const result = await withdrawMarineLicenceSubmitController.handler(
        mockRequest,
        mockH
      )

      expect(mockedAuthenticatedPostRequest).toHaveBeenCalledWith(
        mockRequest,
        `/marine-licence/${marineLicenceId}/withdraw`,
        {}
      )
      expect(mockedClearMarineLicenceCache).toHaveBeenCalledWith(
        mockRequest,
        mockH
      )
      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })

    it('should redirect to dashboard when marine licence ID is missing', async () => {
      mockRequest.payload = {}
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })

      const result = await withdrawMarineLicenceSubmitController.handler(
        mockRequest,
        mockH
      )

      expect(mockedAuthenticatedPostRequest).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })

    it('should redirect to dashboard when marine licence IDs do not match', async () => {
      mockRequest.payload = { marineLicenceId: 'different-id' }
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })

      const result = await withdrawMarineLicenceSubmitController.handler(
        mockRequest,
        mockH
      )

      expect(mockedAuthenticatedPostRequest).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })

    it('should redirect to dashboard when an exception occurs', async () => {
      mockRequest.payload = { marineLicenceId }
      mockedGetMarineLicenceCache.mockReturnValue({ id: marineLicenceId })
      mockedAuthenticatedPostRequest.mockRejectedValue(new Error('Test error'))

      const result = await withdrawMarineLicenceSubmitController.handler(
        mockRequest,
        mockH
      )

      expect(mockRequest.logger.error).toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(routes.DASHBOARD)
      expect(result).toBe('redirect-response')
    })
  })
})
