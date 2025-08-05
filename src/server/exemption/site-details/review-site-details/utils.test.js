import Boom from '@hapi/boom'
import { COORDINATE_SYSTEMS } from '~/src/server/common/constants/exemptions.js'
import { routes } from '~/src/server/common/constants/routes.js'
import {
  buildManualCoordinateSummaryData,
  getCoordinateDisplayText,
  getCoordinateSystemText,
  getFileUploadBackLink,
  getFileUploadSummaryData,
  getReviewSummaryText,
  getSiteDetails,
  getSiteDetailsBackLink,
  handleSubmissionError,
  prepareFileUploadDataForSave,
  prepareManualCoordinateDataForSave,
  renderFileUploadReview,
  renderManualCoordinateReview
} from '~/src/server/exemption/site-details/review-site-details/utils.js'
import { mockExemption } from '~/src/server/test-helpers/mocks.js'

import { getCoordinateSystem } from '~/src/server/common/helpers/session-cache/utils.js'

// Mock the getCoordinateSystem helper
jest.mock('~/src/server/common/helpers/session-cache/utils.js', () => ({
  getCoordinateSystem: jest.fn()
}))

describe('siteDetails utils', () => {
  describe('getSiteDetailsBackLink util', () => {
    test('getSiteDetailsBackLink correctly returns task list when coming from the task list', () => {
      expect(getSiteDetailsBackLink(`http://hostname${routes.TASK_LIST}`)).toBe(
        routes.TASK_LIST
      )
    })

    test('getSiteDetailsBackLink correctly returns page when coming from circle width page', () => {
      expect(
        getSiteDetailsBackLink(`http://hostname${routes.WIDTH_OF_SITE}`)
      ).toBe(routes.WIDTH_OF_SITE)
    })

    test('getSiteDetailsBackLink correctly returns fallback option', () => {
      expect(getSiteDetailsBackLink(undefined)).toBe(routes.TASK_LIST)
    })
  })

  describe('getFileUploadSummaryData util', () => {
    test('getFileUploadSummaryData correctly parses coordinates from geoJSON for KML', () => {
      const exemption = {
        siteDetails: {
          fileUploadType: 'kml',
          uploadedFile: {
            filename: 'test-site.kml'
          },
          geoJSON: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [51.5074, -0.1278]
                }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [0, 0],
                      [1, 0],
                      [1, 1],
                      [0, 1],
                      [0, 0]
                    ]
                  ]
                }
              }
            ]
          }
        }
      }

      const result = getFileUploadSummaryData(exemption)

      expect(result).toEqual(
        expect.objectContaining({
          method: 'Upload a file with the coordinates of the site',
          fileType: 'KML',
          filename: 'test-site.kml',
          coordinates: [
            {
              type: 'Point',
              coordinates: [51.5074, -0.1278]
            },
            {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [0, 0]
                ]
              ]
            }
          ]
        })
      )
    })

    test('getFileUploadSummaryData correctly parses coordinates from geoJSON for Shapefile', () => {
      const exemption = {
        siteDetails: {
          fileUploadType: 'shapefile',
          uploadedFile: {
            filename: 'test-site.shp'
          },
          geoJSON: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [0, 0],
                    [1, 1],
                    [2, 2]
                  ]
                }
              }
            ]
          }
        }
      }

      const result = getFileUploadSummaryData(exemption)

      expect(result).toEqual(
        expect.objectContaining({
          method: 'Upload a file with the coordinates of the site',
          fileType: 'Shapefile',
          filename: 'test-site.shp',
          coordinates: [
            {
              type: 'LineString',
              coordinates: [
                [0, 0],
                [1, 1],
                [2, 2]
              ]
            }
          ]
        })
      )
    })

    test('getFileUploadSummaryData handles empty or missing geoJSON', () => {
      const exemption = {
        siteDetails: {
          fileUploadType: 'kml',
          uploadedFile: {
            filename: 'test-site.kml'
          },
          geoJSON: {}
        }
      }

      const result = getFileUploadSummaryData(exemption)

      expect(result).toEqual(
        expect.objectContaining({
          method: 'Upload a file with the coordinates of the site',
          fileType: 'KML',
          filename: 'test-site.kml',
          coordinates: []
        })
      )
    })

    test('getFileUploadSummaryData handles missing site details', () => {
      const exemption = {}

      expect(() => getFileUploadSummaryData(exemption)).toThrow(
        'Unsupported file type for site details'
      )
    })

    test('getFileUploadSummaryData handles invalid file type', () => {
      const exemption = {
        siteDetails: {
          fileUploadType: 'invalid',
          uploadedFile: {
            filename: 'test-site.xyz'
          },
          geoJSON: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }

      expect(() => getFileUploadSummaryData(exemption)).toThrow(
        'Unsupported file type for site details'
      )
    })
  })

  describe('getReviewSummaryText utils', () => {
    test('getReviewSummaryText correctly returns text for site details circle width text', () => {
      expect(
        getReviewSummaryText({
          coordinatesEntry: 'single',
          coordinatesType: 'coordinates'
        })
      ).toBe(
        'Manually enter one set of coordinates and a width to create a circular site'
      )
    })

    test('getReviewSummaryText correctly returns blank otherwise', () => {
      expect(getReviewSummaryText({})).toBe('')
    })
  })

  describe('getCoordinateSystemText utils', () => {
    test('getCoordinateSystemText correctly returns text for OSGB36', () => {
      expect(getCoordinateSystemText(COORDINATE_SYSTEMS.OSGB36)).toBe(
        'OSGB36 (National Grid)\nEastings and Northings'
      )
    })

    test('getCoordinateSystemText correctly returns text for WGS84', () => {
      expect(getCoordinateSystemText(COORDINATE_SYSTEMS.WGS84)).toBe(
        'WGS84 (World Geodetic System 1984)\nLatitude and longitude'
      )
    })

    test('getReviewSummaryText correctly returns blank otherwise', () => {
      expect(getCoordinateSystemText()).toBe('')
    })
  })

  describe('getCoordinateDisplayText utils', () => {
    test('getCoordinateDisplayText correctly returns text for WGS84', () => {
      expect(
        getCoordinateDisplayText(
          { coordinates: mockExemption.siteDetails.coordinates },
          COORDINATE_SYSTEMS.WGS84
        )
      ).toBe(
        `${mockExemption.siteDetails.coordinates.latitude || ''}, ${mockExemption.siteDetails.coordinates.longitude || ''}`
      )
    })

    test('getCoordinateDisplayText correctly returns text for OSGB36', () => {
      expect(
        getCoordinateDisplayText(
          { coordinates: { eastings: '425053', northings: '564180' } },
          COORDINATE_SYSTEMS.OSGB36
        )
      ).toBe(`425053, 564180`)
    })

    test('getCoordinateDisplayText correctly returns blank when site details blank', () => {
      expect(getCoordinateDisplayText({}, COORDINATE_SYSTEMS.OSGB36)).toBe('')
    })

    test('getCoordinateDisplayText correctly returns blank otherwise', () => {
      expect(getCoordinateDisplayText({})).toBe('')
    })
  })

  describe('getFileUploadBackLink util', () => {
    test('getFileUploadBackLink correctly returns task list when coming from the task list', () => {
      expect(getFileUploadBackLink(`http://hostname${routes.TASK_LIST}`)).toBe(
        routes.TASK_LIST
      )
    })

    test('getFileUploadBackLink correctly returns file upload when coming from other pages', () => {
      expect(
        getFileUploadBackLink(`http://hostname${routes.WIDTH_OF_SITE}`)
      ).toBe(routes.FILE_UPLOAD)
    })

    test('getFileUploadBackLink correctly returns file upload as fallback', () => {
      expect(getFileUploadBackLink(undefined)).toBe(routes.FILE_UPLOAD)
    })

    test('getFileUploadBackLink correctly handles invalid URLs', () => {
      expect(getFileUploadBackLink('invalid-url')).toBe(routes.FILE_UPLOAD)
    })
  })

  describe('buildManualCoordinateSummaryData util', () => {
    test('buildManualCoordinateSummaryData correctly builds summary data with all fields', () => {
      const siteDetails = {
        coordinatesEntry: 'single',
        coordinatesType: 'coordinates',
        coordinates: {
          latitude: '51.5074',
          longitude: '-0.1278'
        },
        circleWidth: '100'
      }
      const coordinateSystem = COORDINATE_SYSTEMS.WGS84

      const result = buildManualCoordinateSummaryData(
        siteDetails,
        coordinateSystem
      )

      expect(result).toEqual({
        method:
          'Manually enter one set of coordinates and a width to create a circular site',
        coordinateSystem:
          'WGS84 (World Geodetic System 1984)\nLatitude and longitude',
        coordinates: '51.5074, -0.1278',
        width: '100 metres'
      })
    })

    test('buildManualCoordinateSummaryData correctly handles OSGB36 coordinates', () => {
      const siteDetails = {
        coordinatesEntry: 'single',
        coordinatesType: 'coordinates',
        coordinates: {
          eastings: '425053',
          northings: '564180'
        },
        circleWidth: '200'
      }
      const coordinateSystem = COORDINATE_SYSTEMS.OSGB36

      const result = buildManualCoordinateSummaryData(
        siteDetails,
        coordinateSystem
      )

      expect(result).toEqual({
        method:
          'Manually enter one set of coordinates and a width to create a circular site',
        coordinateSystem: 'OSGB36 (National Grid)\nEastings and Northings',
        coordinates: '425053, 564180',
        width: '200 metres'
      })
    })

    test('buildManualCoordinateSummaryData correctly handles missing width', () => {
      const siteDetails = {
        coordinatesEntry: 'single',
        coordinatesType: 'coordinates',
        coordinates: {
          latitude: '51.5074',
          longitude: '-0.1278'
        }
      }
      const coordinateSystem = COORDINATE_SYSTEMS.WGS84

      const result = buildManualCoordinateSummaryData(
        siteDetails,
        coordinateSystem
      )

      expect(result.width).toBe('')
    })
  })

  describe('getSiteDetails util', () => {
    const mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn()
      }
    }
    const mockAuthenticatedGetRequest = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('getSiteDetails returns existing site details when available', async () => {
      const exemption = {
        id: 'test-exemption-id',
        siteDetails: {
          coordinatesType: 'coordinates',
          coordinates: { latitude: '51.5074', longitude: '-0.1278' }
        }
      }

      const result = await getSiteDetails(
        mockRequest,
        exemption,
        mockAuthenticatedGetRequest
      )

      expect(result).toEqual(exemption.siteDetails)
      expect(mockAuthenticatedGetRequest).not.toHaveBeenCalled()
    })

    test('getSiteDetails loads from MongoDB when site details undefined', async () => {
      const exemption = {
        id: 'test-exemption-id',
        siteDetails: undefined
      }

      const mockMongoResponse = {
        payload: {
          value: {
            siteDetails: {
              coordinatesType: 'file',
              fileUploadType: 'kml'
            }
          }
        }
      }

      mockAuthenticatedGetRequest.mockResolvedValue(mockMongoResponse)

      const result = await getSiteDetails(
        mockRequest,
        exemption,
        mockAuthenticatedGetRequest
      )

      expect(result).toEqual(mockMongoResponse.payload.value.siteDetails)
      expect(mockAuthenticatedGetRequest).toHaveBeenCalledWith(
        mockRequest,
        '/exemption/test-exemption-id'
      )
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        'Loaded site details from MongoDB for display',
        {
          exemptionId: 'test-exemption-id',
          coordinatesType: 'file'
        }
      )
    })

    test('getSiteDetails handles MongoDB load failure gracefully', async () => {
      const exemption = {
        id: 'test-exemption-id',
        siteDetails: undefined
      }

      const mockError = new Error('MongoDB connection failed')
      mockAuthenticatedGetRequest.mockRejectedValue(mockError)

      const result = await getSiteDetails(
        mockRequest,
        exemption,
        mockAuthenticatedGetRequest
      )

      expect(result).toEqual({})
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Failed to load exemption data from MongoDB',
        {
          error: 'MongoDB connection failed',
          exemptionId: 'test-exemption-id'
        }
      )
    })

    test('getSiteDetails logs warning when MongoDB response has no site details', async () => {
      const exemption = {
        id: 'test-exemption-id',
        siteDetails: undefined
      }

      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn()
        }
      }

      const mockMongoResponse = {
        payload: {
          value: {
            // No siteDetails property in response
            otherData: 'some data'
          }
        }
      }

      mockAuthenticatedGetRequest.mockResolvedValue(mockMongoResponse)

      const result = await getSiteDetails(
        mockRequest,
        exemption,
        mockAuthenticatedGetRequest
      )

      expect(result).toEqual({})
      expect(mockAuthenticatedGetRequest).toHaveBeenCalledWith(
        mockRequest,
        '/exemption/test-exemption-id'
      )
      expect(mockRequest.logger.warn).toHaveBeenCalledWith(
        'No site details found in MongoDB response',
        {
          exemptionId: 'test-exemption-id'
        }
      )
      expect(mockRequest.logger.info).not.toHaveBeenCalled()
    })

    test('getSiteDetails returns empty object when no exemption ID', async () => {
      const exemption = {}

      const result = await getSiteDetails(
        mockRequest,
        exemption,
        mockAuthenticatedGetRequest
      )

      expect(result).toEqual({})
      expect(mockAuthenticatedGetRequest).not.toHaveBeenCalled()
    })
  })

  describe('prepareFileUploadDataForSave util', () => {
    const mockRequest = {
      logger: {
        info: jest.fn()
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('prepareFileUploadDataForSave correctly formats data for API submission', () => {
      const siteDetails = {
        fileUploadType: 'kml',
        geoJSON: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [51.5074, -0.1278]
              }
            }
          ]
        },
        featureCount: 1,
        uploadedFile: {
          filename: 'test-site.kml',
          s3Location: {
            s3Bucket: 'test-bucket',
            s3Key: 'test-key',
            checksumSha256: 'test-checksum'
          }
        }
      }

      const result = prepareFileUploadDataForSave(siteDetails, mockRequest)

      expect(result).toEqual({
        coordinatesType: 'file',
        fileUploadType: 'kml',
        geoJSON: siteDetails.geoJSON,
        featureCount: 1,
        uploadedFile: {
          filename: 'test-site.kml'
        },
        s3Location: {
          s3Bucket: 'test-bucket',
          s3Key: 'test-key',
          checksumSha256: 'test-checksum'
        }
      })

      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        'Saving file upload site details',
        {
          fileType: 'kml',
          featureCount: 1,
          filename: 'test-site.kml'
        }
      )
    })

    test('prepareFileUploadDataForSave handles missing featureCount', () => {
      const siteDetails = {
        fileUploadType: 'shapefile',
        geoJSON: { type: 'FeatureCollection', features: [] },
        uploadedFile: {
          filename: 'test.shp',
          s3Location: {
            s3Bucket: 'bucket',
            s3Key: 'key',
            checksumSha256: 'checksum'
          }
        }
      }

      const result = prepareFileUploadDataForSave(siteDetails, mockRequest)

      expect(result.featureCount).toBe(0)
    })
  })

  describe('prepareManualCoordinateDataForSave util', () => {
    const mockRequest = {
      logger: {
        info: jest.fn()
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('prepareManualCoordinateDataForSave returns site details and logs correctly', () => {
      const exemption = {
        siteDetails: {
          coordinatesType: 'coordinates',
          coordinatesEntry: 'single',
          coordinates: {
            latitude: '51.5074',
            longitude: '-0.1278'
          },
          circleWidth: '100'
        }
      }

      const result = prepareManualCoordinateDataForSave(exemption, mockRequest)

      expect(result).toEqual(exemption.siteDetails)
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        'Saving manual coordinate site details',
        {
          coordinatesType: 'coordinates',
          coordinatesEntry: 'single'
        }
      )
    })
  })

  describe('renderFileUploadReview util', () => {
    const mockH = {
      view: jest.fn()
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('renderFileUploadReview renders correct view with data', () => {
      const exemption = {
        projectName: 'Test Project'
      }
      const siteDetails = {
        fileUploadType: 'kml',
        uploadedFile: {
          filename: 'test-site.kml'
        },
        geoJSON: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [51.5074, -0.1278]
              }
            }
          ]
        }
      }
      const previousPage = `http://hostname${routes.FILE_UPLOAD}`
      const reviewSiteDetailsPageData = {
        pageTitle: 'Review site details'
      }

      renderFileUploadReview(mockH, {
        exemption,
        siteDetails,
        previousPage,
        reviewSiteDetailsPageData
      })

      expect(mockH.view).toHaveBeenCalledWith(
        'exemption/site-details/review-site-details/file-upload-review',
        expect.objectContaining({
          pageTitle: 'Review site details',
          backLink: routes.FILE_UPLOAD,
          projectName: 'Test Project',
          fileUploadSummaryData: expect.objectContaining({
            method: 'Upload a file with the coordinates of the site',
            fileType: 'KML',
            filename: 'test-site.kml',
            coordinates: [
              {
                type: 'Point',
                coordinates: [51.5074, -0.1278]
              }
            ]
          })
        })
      )
    })
  })

  describe('renderManualCoordinateReview util', () => {
    const mockH = {
      view: jest.fn()
    }
    const mockRequest = {}

    beforeEach(() => {
      jest.clearAllMocks()
      // Mock the getCoordinateSystem helper
      getCoordinateSystem.mockReturnValue({
        coordinateSystem: COORDINATE_SYSTEMS.WGS84
      })
    })

    test('renderManualCoordinateReview renders correct view with data', () => {
      const exemption = {
        projectName: 'Test Project'
      }
      const siteDetails = {
        coordinatesEntry: 'single',
        coordinatesType: 'coordinates',
        coordinates: {
          latitude: '51.5074',
          longitude: '-0.1278'
        },
        circleWidth: '100'
      }
      const previousPage = `http://hostname${routes.WIDTH_OF_SITE}`
      const reviewSiteDetailsPageData = {
        pageTitle: 'Review site details'
      }

      renderManualCoordinateReview(mockH, mockRequest, {
        exemption,
        siteDetails,
        previousPage,
        reviewSiteDetailsPageData
      })

      expect(mockH.view).toHaveBeenCalledWith(
        'exemption/site-details/review-site-details/index',
        {
          pageTitle: 'Review site details',
          backLink: routes.WIDTH_OF_SITE,
          projectName: 'Test Project',
          summaryData: {
            method:
              'Manually enter one set of coordinates and a width to create a circular site',
            coordinateSystem:
              'WGS84 (World Geodetic System 1984)\nLatitude and longitude',
            coordinates: '51.5074, -0.1278',
            width: '100 metres'
          },
          siteDetailsData: JSON.stringify({
            coordinatesType: 'coordinates',
            coordinateSystem: 'wgs84',
            coordinatesEntry: 'single',
            coordinates: {
              latitude: '51.5074',
              longitude: '-0.1278'
            },
            circleWidth: '100'
          })
        }
      )
    })
  })

  describe('handleSubmissionError util', () => {
    const mockRequest = {
      logger: {
        error: jest.fn()
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('handleSubmissionError logs error and returns Boom error', () => {
      const error = new Error('Test error message')
      const exemptionId = 'test-exemption-id'
      const coordinatesType = 'coordinates'

      const result = handleSubmissionError(
        mockRequest,
        error,
        exemptionId,
        coordinatesType
      )

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Error submitting site review',
        {
          error: 'Test error message',
          exemptionId: 'test-exemption-id',
          coordinatesType: 'coordinates'
        }
      )

      expect(Boom.isBoom(result)).toBe(true)
      expect(result.output.statusCode).toBe(400)
      expect(result.message).toBe('Error submitting site review')
    })
  })
})
