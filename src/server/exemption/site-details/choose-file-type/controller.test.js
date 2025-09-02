import { createServer } from '~/src/server/index.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { config } from '~/src/config/config.js'
import { JSDOM } from 'jsdom'
import {
  chooseFileTypeController,
  chooseFileTypeSubmitController,
  CHOOSE_FILE_UPLOAD_TYPE_VIEW_ROUTE,
  errorMessages
} from '~/src/server/exemption/site-details/choose-file-type/controller.js'
import * as cacheUtils from '~/src/server/common/helpers/session-cache/utils.js'

jest.mock('~/src/server/common/helpers/session-cache/utils.js')

describe('#chooseFileType', () => {
  /** @type {Server} */
  let server
  let getExemptionCacheSpy

  const mockExemptionState = {
    projectName: 'Test Project',
    fileUploadType: 'shapefile'
  }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    getExemptionCacheSpy = jest
      .spyOn(cacheUtils, 'getExemptionCache')
      .mockReturnValue(mockExemptionState)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('#chooseFileTypeController', () => {
    test('Should provide expected response and correctly pre populate data', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: routes.CHOOSE_FILE_UPLOAD_TYPE
      })

      expect(result).toEqual(
        expect.stringContaining(
          `Choose file type | ${config.get('serviceName')}`
        )
      )

      const { document } = new JSDOM(result).window

      expect(
        document.querySelector(
          'input[name="fileUploadType"][value="shapefile"]:checked'
        )
      ).toBeTruthy()
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should provide expected response and correctly not pre-populate data if it is not present', async () => {
      getExemptionCacheSpy.mockReturnValueOnce({})

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: routes.CHOOSE_FILE_UPLOAD_TYPE
      })

      expect(result).toEqual(
        expect.stringContaining(
          `Choose file type | ${config.get('serviceName')}`
        )
      )

      const { document } = new JSDOM(result).window
      expect(
        document.querySelector('input[name="fileUploadType"]:checked')
      ).toBeFalsy()
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('chooseFileTypeController handler should render view with correct page title, heading, and pre-populated data from cache', () => {
      const h = { view: jest.fn() }

      chooseFileTypeController.handler({}, h)

      expect(h.view).toHaveBeenCalledWith(CHOOSE_FILE_UPLOAD_TYPE_VIEW_ROUTE, {
        pageTitle: 'Choose file type',
        heading: 'Which type of file do you want to upload?',
        payload: { fileUploadType: mockExemptionState.fileUploadType },
        projectName: mockExemptionState.projectName,
        backLink: routes.COORDINATES_TYPE_CHOICE
      })

      getExemptionCacheSpy.mockReturnValueOnce({}) // exmpty excemption cache object

      chooseFileTypeController.handler({}, h)

      expect(h.view).toHaveBeenNthCalledWith(
        2,
        CHOOSE_FILE_UPLOAD_TYPE_VIEW_ROUTE,
        {
          pageTitle: 'Choose file type',
          heading: 'Which type of file do you want to upload?',
          payload: { fileUploadType: '' },
          projectName: undefined, // nothing in the cache
          backLink: routes.COORDINATES_TYPE_CHOICE
        }
      )
    })

    test('Should render details and summary elements', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: routes.CHOOSE_FILE_UPLOAD_TYPE
      })

      const { document } = new JSDOM(result).window

      const detailsElement = document.querySelector('.govuk-details')
      expect(detailsElement).toBeTruthy()

      const summaryElement = document.querySelector('.govuk-details__summary')
      expect(summaryElement).toBeTruthy()
      expect(summaryElement.textContent.trim()).toBe('Help with file types')

      const shapefileHeading = document.querySelector('.govuk-details h2')
      expect(shapefileHeading).toBeTruthy()
      expect(shapefileHeading.textContent.trim()).toBe('Shapefile')

      const shapefileDescription = document.querySelector('.govuk-details p')
      expect(shapefileDescription).toBeTruthy()
      expect(shapefileDescription.textContent.trim()).toMatch(
        /^A shapefile is a collection of files that store map data\./
      )

      const kmlHeading = document.querySelectorAll('.govuk-details h2')[1]
      expect(kmlHeading).toBeTruthy()
      expect(kmlHeading.textContent.trim()).toBe('KML')

      const kmlDescription = document.querySelectorAll('.govuk-details p')[1]
      expect(kmlDescription).toBeTruthy()
      expect(kmlDescription.textContent.trim()).toMatch(
        /^A KML file \(Keyhole Markup Language\) is used to store map data\./
      )

      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('#chooseFileTypeSubmitController', () => {
    test('Should show error messages with invalid data', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: routes.CHOOSE_FILE_UPLOAD_TYPE,
        payload: { fileUploadType: '' }
      })

      const { document } = new JSDOM(result).window

      expect(document.querySelector('.govuk-error-summary')).toBeTruthy()
      expect(
        document.querySelector('.govuk-error-summary__list').textContent
      ).toContain(errorMessages.FILE_TYPE_ENTRY_REQUIRED)

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should correctly validate on empty data', () => {
      const request = {
        payload: { fileUploadType: '' }
      }

      const h = {
        view: jest.fn().mockReturnValue({
          takeover: jest.fn()
        })
      }

      const err = {
        details: [
          {
            path: ['fileUploadType'],
            message: 'FILE_TYPE_ENTRY_REQUIRED',
            type: 'string.empty'
          }
        ]
      }

      chooseFileTypeSubmitController.options.validate.failAction(
        request,
        h,
        err
      )

      expect(h.view).toHaveBeenCalledWith(CHOOSE_FILE_UPLOAD_TYPE_VIEW_ROUTE, {
        pageTitle: 'Choose file type',
        heading: 'Which type of file do you want to upload?',
        projectName: mockExemptionState.projectName,
        payload: { fileUploadType: '' },
        backLink: routes.COORDINATES_TYPE_CHOICE,
        errorSummary: [
          {
            href: '#fileUploadType',
            text: errorMessages.FILE_TYPE_ENTRY_REQUIRED,
            field: ['fileUploadType']
          }
        ],
        errors: {
          fileUploadType: {
            field: ['fileUploadType'],
            href: '#fileUploadType',
            text: errorMessages.FILE_TYPE_ENTRY_REQUIRED
          }
        }
      })

      expect(h.view().takeover).toHaveBeenCalled()
    })

    test('Should correctly handle an incorrectly formed error object', () => {
      const request = {
        payload: { fileUploadType: '' }
      }

      const h = {
        view: jest.fn().mockReturnValue({
          takeover: jest.fn()
        })
      }

      const err = {
        details: null
      }

      chooseFileTypeSubmitController.options.validate.failAction(
        request,
        h,
        err
      )

      expect(h.view).toHaveBeenCalledWith(CHOOSE_FILE_UPLOAD_TYPE_VIEW_ROUTE, {
        pageTitle: 'Choose file type',
        heading: 'Which type of file do you want to upload?',
        projectName: mockExemptionState.projectName,
        payload: { fileUploadType: '' },
        backLink: routes.COORDINATES_TYPE_CHOICE
      })

      expect(h.view().takeover).toHaveBeenCalled()
    })

    test('Should successfully update exemption cache and return 302 status code', async () => {
      const updateExemptionSiteDetailsSpy = jest.spyOn(
        cacheUtils,
        'updateExemptionSiteDetails'
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: routes.CHOOSE_FILE_UPLOAD_TYPE,
        payload: { fileUploadType: 'shapefile' }
      })

      expect(updateExemptionSiteDetailsSpy).toHaveBeenCalledWith(
        expect.anything(),
        'fileUploadType',
        'shapefile'
      )

      expect(statusCode).toBe(statusCodes.redirect)
    })
  })
})
