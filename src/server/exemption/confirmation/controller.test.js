import { confirmationController } from './controller.js'
import { getExemptionCache } from '~/src/server/common/helpers/session-cache/utils.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/session-cache/utils.js')

describe('Confirmation Controller', () => {
  const mockRequest = {
    query: {
      applicationReference: 'REF123456'
    }
  }

  const mockH = {
    view: jest.fn()
  }

  const mockExemption = {
    id: 'test-id',
    projectName: 'Test Project'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    getExemptionCache.mockReturnValue(mockExemption)
  })

  describe('confirmationController.handler', () => {
    it('should render confirmation page with application reference', () => {
      confirmationController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'exemption/confirmation/index',
        expect.objectContaining({
          title: 'Application complete - Defra SDLC Governance Checklist',
          description:
            'Your exemption application has been submitted successfully.',
          applicationReference: 'REF123456',
          id: 'test-id',
          projectName: 'Test Project'
        })
      )
    })

    it('should throw error when application reference is missing', () => {
      const requestWithoutRef = {
        query: {}
      }

      expect(() =>
        confirmationController.handler(requestWithoutRef, mockH)
      ).toThrow('Missing application reference number')
    })

    it('should throw error when application reference is empty string', () => {
      const requestWithEmptyRef = {
        query: {
          applicationReference: ''
        }
      }

      expect(() =>
        confirmationController.handler(requestWithEmptyRef, mockH)
      ).toThrow('Missing application reference number')
    })

    it('should include exemption data from cache', () => {
      const extendedMockExemption = {
        id: 'test-id',
        projectName: 'Test Project',
        activityDescription: 'Test activity'
      }
      getExemptionCache.mockReturnValue(extendedMockExemption)

      confirmationController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'exemption/confirmation/index',
        expect.objectContaining({
          id: 'test-id',
          projectName: 'Test Project',
          activityDescription: 'Test activity',
          applicationReference: 'REF123456'
        })
      )
    })
  })
})
