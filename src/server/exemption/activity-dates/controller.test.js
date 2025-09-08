import { JSDOM } from 'jsdom'
import { ACTIVITY_DATES_VIEW_ROUTE } from '~/src/server/common/constants/activity-dates.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import * as authRequests from '~/src/server/common/helpers/authenticated-requests.js'
import { createDateISO } from '~/src/server/common/helpers/dates/date-utils.js'
import * as cacheUtils from '~/src/server/common/helpers/session-cache/utils.js'
import {
  activityDatesController,
  activityDatesSubmitController
} from '~/src/server/exemption/activity-dates/controller.js'
import { createServer } from '~/src/server/index.js'
import { mockExemption } from '~/src/server/test-helpers/mocks.js'

jest.mock('~/src/server/common/helpers/session-cache/utils.js')

describe('#activityDatesController', () => {
  let server
  let getExemptionCacheSpy

  const mockExemptionState = {
    id: 'test-exemption-id',
    projectName: 'Test Project'
  }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    getExemptionCacheSpy = jest
      .spyOn(cacheUtils, 'getExemptionCache')
      .mockReturnValue(mockExemptionState)

    jest
      .spyOn(authRequests, 'authenticatedPatchRequest')
      .mockResolvedValue({ payload: { id: mockExemption.id } })
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('activityDatesController GET', () => {
    test('should render the activity dates page', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: routes.ACTIVITY_DATES
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Activity dates')

      const { document } = new JSDOM(result).window
      expect(document.querySelector('h1').textContent.trim()).toBe(
        'Activity dates'
      )
      expect(document.querySelector('form').method).toBe('post')
      expect(
        document.querySelector('button[type="submit"]').textContent.trim()
      ).toBe('Save and continue')
    })

    test('should render with empty date fields when no existing data', () => {
      const h = { view: jest.fn() }
      const request = { url: {} }

      activityDatesController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(ACTIVITY_DATES_VIEW_ROUTE, {
        title: 'Activity dates',
        pageTitle: 'Activity dates',
        backLink: routes.TASK_LIST,
        cancelLink: routes.TASK_LIST,
        projectName: mockExemptionState.projectName,
        activityStartDateDay: '',
        activityStartDateMonth: '',
        activityStartDateYear: '',
        activityEndDateDay: '',
        activityEndDateMonth: '',
        activityEndDateYear: ''
      })
    })

    test('should pre-populate form with existing activity dates', () => {
      const exemptionWithDates = {
        ...mockExemptionState,
        activityDates: {
          start: '2025-06-15T00:00:00.000Z',
          end: '2025-06-30T00:00:00.000Z'
        }
      }

      getExemptionCacheSpy.mockReturnValue(exemptionWithDates)

      const h = { view: jest.fn() }
      const request = { url: {} }

      activityDatesController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(ACTIVITY_DATES_VIEW_ROUTE, {
        title: 'Activity dates',
        backLink: routes.TASK_LIST,
        cancelLink: routes.TASK_LIST,
        pageTitle: 'Activity dates',
        projectName: exemptionWithDates.projectName,
        activityStartDateDay: '15',
        activityStartDateMonth: '6',
        activityStartDateYear: '2025',
        activityEndDateDay: '30',
        activityEndDateMonth: '6',
        activityEndDateYear: '2025'
      })
    })
  })

  describe('activityDatesController POST', () => {
    test('should handle form submission with valid data', async () => {
      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(authRequests.authenticatedPatchRequest).toHaveBeenCalledWith(
        expect.any(Object),
        '/exemption/activity-dates',
        expect.objectContaining({
          id: mockExemptionState.id,
          start: expect.any(String),
          end: expect.any(String)
        })
      )
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(routes.TASK_LIST)
    })

    test('should call setExemptionCache when not in site details flow', async () => {
      const mockedSetExemptionCache = jest.mocked(cacheUtils.setExemptionCache)

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(mockedSetExemptionCache).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ...mockExemptionState,
          activityDates: {
            start: expect.any(String),
            end: expect.any(String)
          }
        })
      )
    })

    test('should call updateExemptionSiteDetails when in site details flow with a single site', async () => {
      const mockedUpdateExemptionSiteDetails = jest.mocked(
        cacheUtils.updateExemptionSiteDetails
      )

      const exemptionWithDates = {
        ...mockExemptionState,
        multipleSiteDetails: { multipleSitesEnabled: false },
        activityDates: {
          start: '2025-06-15T00:00:00.000Z',
          end: '2025-06-30T00:00:00.000Z'
        }
      }

      getExemptionCacheSpy.mockReturnValue(exemptionWithDates)

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: routes.SITE_DETAILS_ACTIVITY_DATES,
        payload
      })

      expect(mockedUpdateExemptionSiteDetails).toHaveBeenCalledWith(
        expect.any(Object),
        'activityDates',
        {
          end: '2026-06-15T00:00:00.000Z',
          start: '2026-06-01T00:00:00.000Z'
        }
      )
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(routes.SITE_DETAILS_ACTIVITY_DESCRIPTION)
    })

    test('should call updateExemptionSiteDetails when in site details flow with a multi site', async () => {
      const mockedUpdateExemptionSiteDetails = jest.mocked(
        cacheUtils.updateExemptionSiteDetails
      )

      const exemptionWithDates = {
        ...mockExemptionState,
        multipleSiteDetails: { multipleSitesEnabled: true },
        activityDates: {
          start: '2025-06-15T00:00:00.000Z',
          end: '2025-06-30T00:00:00.000Z'
        }
      }

      getExemptionCacheSpy.mockReturnValue(exemptionWithDates)

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: routes.SITE_DETAILS_ACTIVITY_DATES,
        payload
      })

      expect(mockedUpdateExemptionSiteDetails).toHaveBeenCalledWith(
        expect.any(Object),
        'activityDates',
        {
          start: '2026-06-01T00:00:00.000Z',
          end: '2026-06-15T00:00:00.000Z'
        }
      )
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(routes.SAME_ACTIVITY_DESCRIPTION)
    })

    test('should handle validation errors for missing start date', async () => {
      const payload = {
        'activity-start-date-day': '',
        'activity-start-date-month': '',
        'activity-start-date-year': '',
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': '2025'
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      expect(document.querySelector('.govuk-error-summary')).toBeTruthy()
      expect(result).toContain('Enter the start date')
    })

    test('should handle validation errors for end date before start date', async () => {
      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '15',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '14',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      expect(document.querySelector('.govuk-error-summary')).toBeTruthy()
      expect(result).toContain(
        'The end date must be the same as or after the start date'
      )

      const endDateError = document.querySelector('#activity-end-date-error')
      expect(endDateError).toBeTruthy()
      expect(endDateError.textContent.trim()).toContain(
        'The end date must be the same as or after the start date'
      )
    })

    test('should handle end date before start date - specific scenario 1 (15/06/2025 vs 14/06/2025)', async () => {
      const payload = {
        'activity-start-date-day': '15',
        'activity-start-date-month': '6',
        'activity-start-date-year': '2025',
        'activity-end-date-day': '14',
        'activity-end-date-month': '6',
        'activity-end-date-year': '2025'
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      const errorSummary = document.querySelector('.govuk-error-summary')
      expect(errorSummary).toBeTruthy()

      // Date order validation now takes precedence over future date validation
      // This ensures end date before start date errors are shown correctly
      expect(result).toContain(
        'The end date must be the same as or after the start date'
      )

      const endDateError = document.querySelector('#activity-end-date-error')
      expect(endDateError).toBeTruthy()
      expect(endDateError.textContent.trim()).toContain(
        'The end date must be the same as or after the start date'
      )
    })

    test('should handle end date before start date - specific scenario 2 (15/06/2026 vs 15/06/2025)', async () => {
      const payload = {
        'activity-start-date-day': '15',
        'activity-start-date-month': '6',
        'activity-start-date-year': '2026',
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': '2025'
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      const errorSummary = document.querySelector('.govuk-error-summary')
      expect(errorSummary).toBeTruthy()

      // Date order validation now takes precedence over future date validation
      // This ensures end date before start date errors are shown correctly
      expect(result).toContain(
        'The end date must be the same as or after the start date'
      )

      const endDateError = document.querySelector('#activity-end-date-error')
      expect(endDateError).toBeTruthy()
      expect(endDateError.textContent.trim()).toContain(
        'The end date must be the same as or after the start date'
      )
    })

    test('should handle past start date - year validation error', async () => {
      // With the new joi.number() approach, past years get caught by MIN_YEAR validation
      // This test verifies that behavior - the minYearError should be used for past years
      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '12',
        'activity-start-date-year': (currentYear - 1).toString(), // Past year
        'activity-end-date-day': '1',
        'activity-end-date-month': '1',
        'activity-end-date-year': (currentYear + 1).toString() // Future year
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      const errorSummary = document.querySelector('.govuk-error-summary')
      expect(errorSummary).toBeTruthy()

      // The minYearError should map to the custom error message via the controller's errorMessages mapping
      expect(result).toContain('The start date must be today or in the future')

      const startDateError = document.querySelector(
        '#activity-start-date-error'
      )
      expect(startDateError).toBeTruthy()
      expect(startDateError.textContent.trim()).toContain(
        'The start date must be today or in the future'
      )
    })

    test('should handle validation errors for invalid dates', async () => {
      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '1',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '31',
        'activity-end-date-month': '4',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      expect(document.querySelector('.govuk-error-summary')).toBeTruthy()
      expect(result).toContain('The end date must be a real date')
    })

    test('should handle validation errors for past dates', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload: {
          'activity-start-date-day': '15',
          'activity-start-date-month': '6',
          'activity-start-date-year': '2020',
          'activity-end-date-day': '16',
          'activity-end-date-month': '6',
          'activity-end-date-year': '2020'
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      const errorSummary = document.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()

      const errorLinks = Array.from(errorSummary.querySelectorAll('a'))
      const errorTexts = errorLinks.map((link) => link.textContent.trim())

      // With the new joi.number() approach, both start and end dates from 2020
      // will trigger year validation errors, resulting in two similar messages
      expect(errorTexts).toContain(
        'The start date must be today or in the future'
      )
      expect(errorTexts).toContain(
        'The end date must be today or in the future'
      )

      expect(errorTexts).not.toContain('The start date must be a real date')
      expect(errorTexts).not.toContain('The end date must be a real date')

      // Both dates should have appropriate error messages for past years
      expect(errorTexts.length).toBeGreaterThanOrEqual(2)
    })

    test('should not show duplicate error messages for past dates', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload: {
          'activity-start-date-day': '15',
          'activity-start-date-month': '6',
          'activity-start-date-year': '2025',
          'activity-end-date-day': '16',
          'activity-end-date-month': '6',
          'activity-end-date-year': '2025'
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window
      const errorSummary = document.querySelector('.govuk-error-summary')
      expect(errorSummary).toBeTruthy()

      const errorLinks = Array.from(errorSummary.querySelectorAll('a'))
      const errorTexts = errorLinks.map((link) => link.textContent.trim())
      const uniqueErrors = new Set(errorTexts)
      expect(uniqueErrors.size).toBe(errorTexts.length)
    })

    test('should handle API errors gracefully', async () => {
      const apiPatchMock = jest.spyOn(authRequests, 'authenticatedPatchRequest')
      apiPatchMock.mockRejectedValueOnce({
        res: { statusCode: 500 },
        data: {}
      })

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toContain('500')
    })

    test('should handle API validation errors', async () => {
      const apiPatchMock = jest.spyOn(authRequests, 'authenticatedPatchRequest')
      apiPatchMock.mockRejectedValueOnce({
        data: {
          payload: {
            validation: {
              details: [
                {
                  path: ['start'],
                  message: 'CUSTOM_START_DATE_INVALID',
                  type: 'custom.startDate.invalid'
                }
              ]
            }
          }
        }
      })

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Activity dates')
    })

    test('should handle impossible dates with field-level real date errors', async () => {
      // Test month 14 which triggers number.max validation
      const payloadMonth14 = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '1',
        'activity-start-date-year': (new Date().getFullYear() + 1).toString(),
        'activity-end-date-day': '1',
        'activity-end-date-month': '14', // Invalid month > 12
        'activity-end-date-year': (new Date().getFullYear() + 1).toString()
      }

      const { result: resultMonth14, statusCode: statusCodeMonth14 } =
        await server.inject({
          method: 'POST',
          url: routes.ACTIVITY_DATES,
          payload: payloadMonth14
        })

      expect(statusCodeMonth14).toBe(statusCodes.ok)

      const { document: documentMonth14 } = new JSDOM(resultMonth14).window
      const errorSummaryMonth14 = documentMonth14.querySelector(
        '.govuk-error-summary'
      )
      expect(errorSummaryMonth14).toBeTruthy()

      // Should show "real date" error message in field-level error element
      expect(resultMonth14).toContain('The end date must be a real date')

      const endDateErrorMonth14 = documentMonth14.querySelector(
        '#activity-end-date-error'
      )
      expect(endDateErrorMonth14).toBeTruthy()
      expect(endDateErrorMonth14.textContent.trim()).toContain(
        'The end date must be a real date'
      )

      // Test day 32 which also triggers number.max validation
      const payloadDay32 = {
        'activity-start-date-day': '32', // Invalid day > 31
        'activity-start-date-month': '1',
        'activity-start-date-year': (new Date().getFullYear() + 1).toString(),
        'activity-end-date-day': '1',
        'activity-end-date-month': '1',
        'activity-end-date-year': (new Date().getFullYear() + 1).toString()
      }

      const { result: resultDay32, statusCode: statusCodeDay32 } =
        await server.inject({
          method: 'POST',
          url: routes.ACTIVITY_DATES,
          payload: payloadDay32
        })

      expect(statusCodeDay32).toBe(statusCodes.ok)

      const { document: documentDay32 } = new JSDOM(resultDay32).window
      const errorSummaryDay32 = documentDay32.querySelector(
        '.govuk-error-summary'
      )
      expect(errorSummaryDay32).toBeTruthy()

      // Should show "real date" error message in field-level error element
      expect(resultDay32).toContain('The start date must be a real date')

      const startDateErrorDay32 = documentDay32.querySelector(
        '#activity-start-date-error'
      )
      expect(startDateErrorDay32).toBeTruthy()
      expect(startDateErrorDay32.textContent.trim()).toContain(
        'The start date must be a real date'
      )
    })
  })

  describe('Error handling logic', () => {
    test('should test createDateISO function with valid input', () => {
      const result = createDateISO('2025', '6', '15')
      expect(result).toBe('2025-06-15T00:00:00.000Z')
    })

    test('should test createDateISO function with invalid input', () => {
      const result = createDateISO('invalid', 'invalid', 'invalid')
      expect(result).toBeNull()
    })

    test('should correctly identify missing complete start date', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-start-date-day',
            path: ['activity-start-date-day']
          },
          {
            type: 'activity-start-date-month',
            path: ['activity-start-date-month']
          },
          {
            type: 'activity-start-date-year',
            path: ['activity-start-date-year']
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.startDateErrorMessage).toEqual({
        text: 'Enter the start date'
      })
    })

    test('should correctly identify custom validation errors', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'custom.endDate.before.startDate',
            path: [],
            message: 'custom.endDate.before.startDate'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toEqual({
        text: 'The end date must be the same as or after the start date'
      })
      expect(viewData.errorSummary).toContainEqual({
        href: '#activity-end-date-day',
        text: 'The end date must be the same as or after the start date'
      })
    })

    test('should correctly handle individual field errors', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-start-date-day',
            path: ['activity-start-date-day'],
            message: 'activity-start-date-day'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.startDateErrorMessage).toEqual({
        text: 'The start date must include a day'
      })
    })

    test('should handle start date invalid custom error', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'custom.startDate.invalid',
            path: [],
            message: 'custom.startDate.invalid'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.startDateErrorMessage).toEqual({
        text: 'The start date must be a real date'
      })
    })

    test('should handle start date month error', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-start-date-month',
            path: ['activity-start-date-month'],
            message: 'activity-start-date-month'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.startDateErrorMessage).toEqual({
        text: 'The start date must include a month'
      })
    })

    test('should return null for start date when no errors match', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'some-other-error',
            path: ['some-field'],
            message: 'some-other-error'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.startDateErrorMessage).toBeNull()
    })

    test('should handle end date missing complete error', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-end-date-day',
            path: ['activity-end-date-day']
          },
          {
            type: 'activity-end-date-month',
            path: ['activity-end-date-month']
          },
          {
            type: 'activity-end-date-year',
            path: ['activity-end-date-year']
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toEqual({
        text: 'Enter the end date'
      })
    })

    test('should handle end date invalid custom error', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'custom.endDate.invalid',
            path: [],
            message: 'custom.endDate.invalid'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toEqual({
        text: 'The end date must be a real date'
      })
    })

    test('should handle end date day error', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-end-date-day',
            path: ['activity-end-date-day'],
            message: 'activity-end-date-day'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toEqual({
        text: 'The end date must include a day'
      })
    })

    test('should handle end date month error', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-end-date-month',
            path: ['activity-end-date-month'],
            message: 'activity-end-date-month'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toEqual({
        text: 'The end date must include a month'
      })
    })

    test('should return null for end date when no errors match', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'some-other-error',
            path: ['some-field'],
            message: 'some-other-error'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toBeNull()
    })

    test('should handle API errors without validation details', async () => {
      const apiPatchMock = jest.spyOn(authRequests, 'authenticatedPatchRequest')
      apiPatchMock.mockRejectedValueOnce({
        message: 'Network error',
        data: {}
      })

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const { statusCode } = await server.inject({
        method: 'POST',
        url: routes.ACTIVITY_DATES,
        payload
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    test('should handle start date year error specifically', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-start-date-year',
            path: ['activity-start-date-year'],
            message: 'activity-start-date-year'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.startDateErrorMessage).toEqual({
        text: 'The start date must include a year'
      })
    })

    test('should handle end date year error specifically', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'activity-end-date-year',
            path: ['activity-end-date-year'],
            message: 'activity-end-date-year'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      expect(viewData.endDateErrorMessage).toEqual({
        text: 'The end date must include a year'
      })
    })

    test('should cover line 132 - end date invalid custom error in addCustomValidationErrors', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'custom.endDate.invalid',
            path: [],
            message: 'custom.endDate.invalid'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      // Check that the error is added to error summary (line 132)
      expect(viewData.errorSummary).toContainEqual({
        href: '#activity-end-date-day',
        text: 'The end date must be a real date'
      })
    })

    test('should cover line 233 - end date today or future error message', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      const err = {
        details: [
          {
            type: 'custom.endDate.todayOrFuture',
            path: [],
            message: 'custom.endDate.todayOrFuture'
          }
        ]
      }

      const request = { payload: {}, url: {} }

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalled()
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]

      // Check that line 233 is covered
      expect(viewData.endDateErrorMessage).toEqual({
        text: 'The end date must be today or in the future'
      })
    })

    test('should cover line 314 - return h.view when no error details in failAction', () => {
      const h = {
        view: jest.fn().mockReturnThis(),
        takeover: jest.fn()
      }

      // Create an error without details to trigger line 314 (return h)
      const err = {} // No details property

      const request = { payload: { 'test-field': 'test-value' }, url: {} }

      getExemptionCacheSpy.mockReturnValueOnce({
        projectName: 'Test Project'
      })

      activityDatesSubmitController.options.validate.failAction(request, h, err)

      expect(h.view).toHaveBeenCalledWith(
        ACTIVITY_DATES_VIEW_ROUTE,
        expect.objectContaining({
          projectName: 'Test Project',
          title: 'Activity dates',
          // The payload is now processed by createTemplateData, not passed directly
          activityStartDateDay: '',
          activityStartDateMonth: '',
          activityStartDateYear: '',
          activityEndDateDay: '',
          activityEndDateMonth: '',
          activityEndDateYear: ''
        })
      )
      expect(h.takeover).toHaveBeenCalled()
    })

    test('should cover line 414 - throw error when no validation details in handler', async () => {
      const apiPatchMock = jest.spyOn(authRequests, 'authenticatedPatchRequest')
      // Create an error without validation details to trigger the throw on line 414
      const networkError = new Error('Network error')
      networkError.data = { payload: {} } // No validation property
      apiPatchMock.mockRejectedValueOnce(networkError)

      // Mock getExemptionCache to return a valid exemption
      getExemptionCacheSpy.mockReturnValueOnce({
        id: 'test-id',
        projectName: 'Test Project'
      })

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const request = { payload, url: {} }
      const h = { redirect: jest.fn() }

      // This should trigger line 414 (throw e) since there are no validation details
      await expect(
        activityDatesSubmitController.handler(request, h)
      ).rejects.toThrow('Network error')
    })

    test('should cover lines 423-428 - API error with validation details', async () => {
      // Mock the API to return an error with validation details
      const apiPatchMock = jest.spyOn(authRequests, 'authenticatedPatchRequest')
      const apiError = new Error('API validation error')
      apiError.data = {
        payload: {
          validation: {
            details: [
              {
                type: 'activity-start-date-day',
                path: ['activity-start-date-day'],
                message: 'Start date day is invalid'
              }
            ]
          }
        }
      }
      apiPatchMock.mockRejectedValueOnce(apiError)

      // Mock getExemptionCache to return a valid exemption
      getExemptionCacheSpy.mockReturnValueOnce({
        id: 'test-id',
        projectName: 'Test Project'
      })

      const h = {
        view: jest.fn()
      }

      const currentYear = new Date().getFullYear()
      const payload = {
        'activity-start-date-day': '1',
        'activity-start-date-month': '6',
        'activity-start-date-year': (currentYear + 1).toString(),
        'activity-end-date-day': '15',
        'activity-end-date-month': '6',
        'activity-end-date-year': (currentYear + 1).toString()
      }

      const request = { payload, url: {} }

      // Call the handler directly to hit the catch block
      await activityDatesSubmitController.handler(request, h)

      // Verify that h.view was called with the correct parameters (lines 423-428)
      expect(h.view).toHaveBeenCalledWith(
        ACTIVITY_DATES_VIEW_ROUTE,
        expect.objectContaining({
          projectName: 'Test Project',
          activityStartDateDay: '1',
          activityStartDateMonth: '6',
          activityStartDateYear: (currentYear + 1).toString(),
          activityEndDateDay: '15',
          activityEndDateMonth: '6',
          activityEndDateYear: (currentYear + 1).toString(),
          errors: expect.any(Object),
          errorSummary: expect.any(Array)
        })
      )

      // Verify specific payload assignments that should cover lines 423-428
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]
      expect(viewData.activityStartDateDay).toBe('1') // Line 423
      expect(viewData.activityStartDateMonth).toBe('6') // Line 424
      expect(viewData.activityStartDateYear).toBe((currentYear + 1).toString()) // Line 425
      expect(viewData.activityEndDateDay).toBe('15') // Line 426
      expect(viewData.activityEndDateMonth).toBe('6') // Line 427
      expect(viewData.activityEndDateYear).toBe((currentYear + 1).toString()) // Line 428
    })

    test('should cover lines 423-428 with empty payload values - API error fallback', async () => {
      // Mock the API to return an error with validation details
      const apiPatchMock = jest.spyOn(authRequests, 'authenticatedPatchRequest')
      const apiError = new Error('API validation error')
      apiError.data = {
        payload: {
          validation: {
            details: [
              {
                type: 'activity-start-date-day',
                path: ['activity-start-date-day'],
                message: 'Start date day is invalid'
              }
            ]
          }
        }
      }
      apiPatchMock.mockRejectedValueOnce(apiError)

      // Mock getExemptionCache to return a valid exemption
      getExemptionCacheSpy.mockReturnValueOnce({
        id: 'test-id',
        projectName: 'Test Project'
      })

      const h = {
        view: jest.fn()
      }

      // Use empty payload to test the || '' fallback logic
      const payload = {}

      const request = { payload, url: {} }

      // Call the handler directly to hit the catch block
      await activityDatesSubmitController.handler(request, h)

      // Verify that h.view was called with empty string fallbacks (lines 423-428)
      const viewCall = h.view.mock.calls[0]
      const viewData = viewCall[1]
      expect(viewData.activityStartDateDay).toBe('') // Line 423 fallback
      expect(viewData.activityStartDateMonth).toBe('') // Line 424 fallback
      expect(viewData.activityStartDateYear).toBe('') // Line 425 fallback
      expect(viewData.activityEndDateDay).toBe('') // Line 426 fallback
      expect(viewData.activityEndDateMonth).toBe('') // Line 427 fallback
      expect(viewData.activityEndDateYear).toBe('') // Line 428 fallback
    })
  })
})
