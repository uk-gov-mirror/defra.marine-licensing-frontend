import { JSDOM } from 'jsdom'
import { COORDINATE_SYSTEMS } from '~/src/server/common/constants/exemptions.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import * as authRequests from '~/src/server/common/helpers/authenticated-requests.js'
import * as cacheUtils from '~/src/server/common/helpers/session-cache/utils.js'
import * as coordinateUtils from '~/src/server/common/helpers/coordinate-utils.js'
import { createServer } from '~/src/server/index.js'
import { mockExemption } from '~/src/server/test-helpers/mocks.js'

jest.mock('~/src/server/common/helpers/session-cache/utils.js')
jest.mock('~/src/server/common/helpers/coordinate-utils.js')
jest.mock('~/src/server/common/helpers/authenticated-requests.js')

const OSGB36_EASTINGS_NORTHINGS = { eastings: '123456', northings: '654321' }
const WGS84_LATITUDE_LONGITUDE = {
  latitude: '50.123456',
  longitude: '-1.234567'
}
const PROJECTED_OSGB36_COORDINATES = [123456, 654321]
const PROJECTED_WGS84_COORDINATES = [-1.234567, 50.123456]

const CIRCLE_WIDTH_100M = '100'
const CIRCLE_WIDTH_200M = '200'

const GEOJSON_POLYGON_FEATURE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1.2345, 50.1234],
            [-1.23, 50.1234],
            [-1.23, 50.12],
            [-1.2345, 50.12],
            [-1.2345, 50.1234]
          ]
        ]
      }
    }
  ]
}

describe('Site Details Interactive Map Behaviour', () => {
  let server
  let mapContainer
  let siteDataScript
  let window
  let document

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest
      .spyOn(cacheUtils, 'setExemptionCache')
      .mockImplementation(() => undefined)
    jest
      .spyOn(cacheUtils, 'resetExemptionSiteDetails')
      .mockReturnValue({ siteDetails: null })
    jest.spyOn(authRequests, 'authenticatedPatchRequest').mockResolvedValue({
      payload: { id: mockExemption.id, siteDetails: mockExemption.siteDetails }
    })
  })

  const createExemptionWithSiteDetails = (siteDetailsOverride = {}) => ({
    ...mockExemption,
    siteDetails: {
      ...mockExemption.siteDetails,
      ...siteDetailsOverride
    }
  })

  const renderPageAndExtractMapElements = async (exemption = mockExemption) => {
    jest.spyOn(cacheUtils, 'getExemptionCache').mockReturnValue(exemption)

    if (exemption.siteDetails?.coordinateSystem) {
      jest.spyOn(coordinateUtils, 'getCoordinateSystem').mockReturnValue({
        coordinateSystem: exemption.siteDetails.coordinateSystem
      })
    }

    jest.spyOn(authRequests, 'authenticatedGetRequest').mockResolvedValue({
      payload: { value: exemption }
    })

    const response = await server.inject({
      method: 'GET',
      url: routes.REVIEW_SITE_DETAILS,
      auth: {
        strategy: 'session',
        credentials: { userId: 'test-user-id', sessionId: 'test-session-id' }
      }
    })

    expect(response.statusCode).toBe(statusCodes.ok)

    const dom = new JSDOM(response.result, { runScripts: 'dangerously' })
    window = dom.window
    document = window.document

    mapContainer = document.querySelector('.app-site-details-map')
    siteDataScript = document.querySelector('#site-details-data')

    return { window, document, mapContainer, siteDataScript }
  }

  const extractEmbeddedSiteData = (siteDataScript) => {
    return JSON.parse(siteDataScript.textContent)
  }

  describe('When map initialises with manual coordinate entry', () => {
    const createMapTestExpectations = (
      coordinateSystem,
      coordinates,
      circleWidth
    ) => ({
      coordinateSystem,
      coordinates,
      circleWidth
    })

    test.each([
      [
        'OSGB36 eastings and northings',
        COORDINATE_SYSTEMS.OSGB36,
        OSGB36_EASTINGS_NORTHINGS,
        null
      ],
      [
        'WGS84 latitude and longitude',
        COORDINATE_SYSTEMS.WGS84,
        WGS84_LATITUDE_LONGITUDE,
        null
      ],
      [
        '100 metre circular area',
        COORDINATE_SYSTEMS.WGS84,
        WGS84_LATITUDE_LONGITUDE,
        CIRCLE_WIDTH_100M
      ],
      [
        '200 metre circular area',
        COORDINATE_SYSTEMS.WGS84,
        WGS84_LATITUDE_LONGITUDE,
        CIRCLE_WIDTH_200M
      ]
    ])(
      'prepares map data for %s coordinates',
      async (testName, coordinateSystem, coordinates, circleWidth) => {
        const exemption = createExemptionWithSiteDetails({
          coordinateSystem,
          coordinates,
          circleWidth
        })

        await renderPageAndExtractMapElements(exemption)

        expect(siteDataScript).toBeInTheDocument()
        const siteData = extractEmbeddedSiteData(siteDataScript)

        expect(mapContainer).toBeInTheDocument()
        expect(mapContainer.getAttribute('data-module')).toBe(
          'site-details-map'
        )

        const expectations = createMapTestExpectations(
          coordinateSystem,
          coordinates,
          circleWidth
        )
        expect(siteData.coordinateSystem).toBe(expectations.coordinateSystem)
        expect(siteData.coordinates).toEqual(expectations.coordinates)
        expect(siteData.circleWidth).toBe(expectations.circleWidth)
      }
    )
  })

  describe('When map initialises with uploaded file coordinates', () => {
    test('prepares GeoJSON polygon data for shapefile visualisation', async () => {
      expect.hasAssertions()

      const exemptionWithShapefileUpload = createExemptionWithSiteDetails({
        coordinatesType: 'file',
        fileUploadType: 'shapefile',
        uploadedFile: { filename: 'site-boundaries.zip' },
        geoJSON: GEOJSON_POLYGON_FEATURE
      })

      await renderPageAndExtractMapElements(exemptionWithShapefileUpload)

      expect(siteDataScript).toBeInTheDocument()
      const siteData = extractEmbeddedSiteData(siteDataScript)

      expect(siteData.coordinatesType).toBe('file')
      expect(siteData.fileUploadType).toBe('shapefile')
      expect(siteData.geoJSON).toEqual(GEOJSON_POLYGON_FEATURE)
      expect(siteData.geoJSON.features[0].geometry.type).toBe('Polygon')
      expect(siteData.geoJSON.features[0].geometry.coordinates[0]).toHaveLength(
        5
      )
    })

    const createPointGeoJSON = (coordinates) => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates
          }
        }
      ]
    })

    test.each([
      [
        'OSGB36 coordinate projection',
        'shapefile',
        'osgb36-site.zip',
        PROJECTED_OSGB36_COORDINATES
      ],
      [
        'KML file visualisation',
        'kml',
        'site-location.kml',
        PROJECTED_WGS84_COORDINATES
      ]
    ])(
      'prepares GeoJSON point data for %s',
      async (testName, fileUploadType, filename, coordinates) => {
        expect.hasAssertions()

        const geoJSONPointFeature = createPointGeoJSON(coordinates)

        const exemption = createExemptionWithSiteDetails({
          coordinatesType: 'file',
          fileUploadType,
          uploadedFile: { filename },
          geoJSON: geoJSONPointFeature
        })

        await renderPageAndExtractMapElements(exemption)

        expect(siteDataScript).toBeInTheDocument()
        const siteData = extractEmbeddedSiteData(siteDataScript)

        expect(siteData.coordinatesType).toBe('file')
        expect(siteData.fileUploadType).toBe(fileUploadType)
        expect(siteData.geoJSON).toEqual(geoJSONPointFeature)
        expect(siteData.geoJSON.features[0].geometry.type).toBe('Point')
        expect(siteData.geoJSON.features[0].geometry.coordinates).toEqual(
          coordinates
        )
      }
    )
  })

  describe('When map handles edge cases and error conditions', () => {
    test('prepares map container even when coordinate data is missing', async () => {
      const exemptionWithoutSiteDetails = createExemptionWithSiteDetails({})

      await renderPageAndExtractMapElements(exemptionWithoutSiteDetails)

      expect(siteDataScript).toBeInTheDocument()
      const siteData = extractEmbeddedSiteData(siteDataScript)

      expect(mapContainer).toBeInTheDocument()
      expect(mapContainer.getAttribute('data-module')).toBe('site-details-map')
      expect(siteData).toBeDefined()
    })

    test('embeds invalid coordinate data for map error handling', async () => {
      expect.hasAssertions()

      const exemptionWithInvalidCoordinates = createExemptionWithSiteDetails({
        coordinateSystem: COORDINATE_SYSTEMS.WGS84,
        coordinates: {
          latitude: 'invalid-latitude',
          longitude: 'invalid-longitude'
        },
        circleWidth: null
      })

      await renderPageAndExtractMapElements(exemptionWithInvalidCoordinates)

      expect(siteDataScript).toBeInTheDocument()
      const siteData = extractEmbeddedSiteData(siteDataScript)

      expect(siteData.coordinateSystem).toBe(COORDINATE_SYSTEMS.WGS84)
      expect(siteData.coordinates.latitude).toBe('invalid-latitude')
      expect(siteData.coordinates.longitude).toBe('invalid-longitude')
    })
  })

  describe('When map data is prepared for JavaScript initialisation', () => {
    test('includes required OpenLayers stylesheet for map rendering', async () => {
      const exemptionWithBasicCoordinates = createExemptionWithSiteDetails({
        coordinateSystem: COORDINATE_SYSTEMS.WGS84,
        coordinates: WGS84_LATITUDE_LONGITUDE
      })

      await renderPageAndExtractMapElements(exemptionWithBasicCoordinates)

      const openLayersCSS = document.querySelector(
        'link[href="/public/stylesheets/ol.css"]'
      )
      expect(openLayersCSS).toBeInTheDocument()
      expect(openLayersCSS.getAttribute('rel')).toBe('stylesheet')
    })

    test('embeds coordinate data in script tag for map JavaScript consumption', async () => {
      const exemptionWithSpecificData = createExemptionWithSiteDetails({
        coordinateSystem: COORDINATE_SYSTEMS.OSGB36,
        coordinates: OSGB36_EASTINGS_NORTHINGS,
        circleWidth: CIRCLE_WIDTH_100M
      })

      await renderPageAndExtractMapElements(exemptionWithSpecificData)

      expect(siteDataScript).toBeInTheDocument()
      expect(siteDataScript.tagName).toBe('SCRIPT')
      expect(siteDataScript.getAttribute('type')).toBe('application/json')
      expect(siteDataScript.getAttribute('id')).toBe('site-details-data')

      const siteData = extractEmbeddedSiteData(siteDataScript)
      expect(siteData.coordinateSystem).toBe(COORDINATE_SYSTEMS.OSGB36)
      expect(siteData.coordinates).toEqual(OSGB36_EASTINGS_NORTHINGS)
      expect(siteData.circleWidth).toBe(CIRCLE_WIDTH_100M)
    })
  })
})
