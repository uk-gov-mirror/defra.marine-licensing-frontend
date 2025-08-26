import { COORDINATE_SYSTEMS } from '~/src/server/common/constants/exemptions.js'

const baseSubmittedExemption = {
  id: '507f1f77bcf86cd799439011',
  status: 'Submitted',
  applicationReference: 'EXE/2025/00003',
  submittedAt: '2025-01-01T10:00:00.000Z',
  projectName: 'Test Marine Activity Project',
  activityDates: {
    start: '2025-06-15',
    end: '2025-08-30'
  },
  activityDescription:
    'Marine construction activities including pile driving and dredging operations.',
  publicRegister: {
    consent: 'no'
  }
}

export const createSubmittedExemption = (overrides = {}) => ({
  ...baseSubmittedExemption,
  ...overrides
})

export const createExemptionWithSiteDetails = (siteDetailsOverrides = {}) =>
  createSubmittedExemption({
    siteDetails: {
      coordinatesType: 'coordinates',
      coordinatesEntry: 'single',
      coordinateSystem: COORDINATE_SYSTEMS.WGS84,
      coordinates: { latitude: '51.489676', longitude: '-0.231530' },
      circleWidth: '100',
      ...siteDetailsOverrides
    }
  })

export const createFileUploadExemption = (
  fileType = 'kml',
  filename = 'test.kml',
  additionalOverrides = {}
) =>
  createExemptionWithSiteDetails({
    coordinatesType: 'file',
    fileUploadType: fileType,
    uploadedFile: { filename },
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
    ...additionalOverrides
  })

export const createPolygonExemption = (coordinateSystem, coordinates) =>
  createExemptionWithSiteDetails({
    coordinatesType: 'coordinates',
    coordinatesEntry: 'multiple',
    coordinateSystem,
    coordinates
  })

export const mockPolygonCoordinatesWGS84 = [
  { latitude: '55.123456', longitude: '-1.234567' },
  { latitude: '55.223456', longitude: '-1.334567' },
  { latitude: '55.323456', longitude: '-1.434567' }
]

export const mockPolygonCoordinatesOSGB36 = [
  { eastings: '123456', northings: '654321' },
  { eastings: '123556', northings: '654421' },
  { eastings: '123656', northings: '654521' }
]

const baseExpectedContent = {
  pageTitle: 'View notification details',
  pageCaption: 'EXE/2025/00003 - Exempt activity notification',
  backLinkText: 'Back',
  backLinkHref: '/home',
  summaryCards: [
    'Project details',
    'Activity dates',
    'Activity details',
    'Site details',
    'Public register'
  ],
  projectDetails: {
    'Project name': 'Test Marine Activity Project'
  },
  activityDates: {
    'Start date': '15 June 2025',
    'End date': '30 August 2025'
  },
  activityDetails: {
    'Activity description':
      'Marine construction activities including pile driving and dredging operations.'
  },
  publicRegister: {
    'Information withheld from public register': 'No'
  }
}

export const testScenarios = [
  {
    name: 'Circular site with WGS84 coordinates',
    exemption: createExemptionWithSiteDetails({
      coordinatesType: 'coordinates',
      coordinatesEntry: 'single',
      coordinateSystem: COORDINATE_SYSTEMS.WGS84,
      coordinates: { latitude: '51.489676', longitude: '-0.231530' },
      circleWidth: '100'
    }),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Manually enter one set of coordinates and a width to create a circular site',
        'Coordinate system':
          'WGS84 (World Geodetic System 1984) Latitude and longitude',
        'Coordinates at centre of site': '51.489676, -0.231530',
        'Width of circular site': '100 metres'
      }
    }
  },
  {
    name: 'Circular site with OSGB36 coordinates',
    exemption: createExemptionWithSiteDetails({
      coordinatesType: 'coordinates',
      coordinatesEntry: 'single',
      coordinateSystem: COORDINATE_SYSTEMS.OSGB36,
      coordinates: { eastings: '123456', northings: '654321' },
      circleWidth: '250'
    }),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Manually enter one set of coordinates and a width to create a circular site',
        'Coordinate system': 'OSGB36 (National Grid) Eastings and Northings',
        'Coordinates at centre of site': '123456, 654321',
        'Width of circular site': '250 metres'
      }
    }
  },
  {
    name: 'KML file upload',
    exemption: createFileUploadExemption('kml', 'test_site.kml'),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Upload a file with the coordinates of the site',
        'File type': 'KML',
        'File uploaded': 'test_site.kml'
      }
    }
  },
  {
    name: 'Shapefile upload',
    exemption: createFileUploadExemption('shapefile', 'site_boundary.zip'),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Upload a file with the coordinates of the site',
        'File type': 'Shapefile',
        'File uploaded': 'site_boundary.zip'
      }
    }
  },
  {
    name: 'Polygon site with WGS84 coordinates',
    exemption: createPolygonExemption(
      COORDINATE_SYSTEMS.WGS84,
      mockPolygonCoordinatesWGS84
    ),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Manually enter multiple sets of coordinates to mark the boundary of the site',
        'Coordinate system':
          'WGS84 (World Geodetic System 1984) Latitude and longitude'
      },
      siteDetailsExtended: {
        expectedRowCount: 6, // Method + Coordinate System + 3 coordinate points + map
        coordinatePoints: [
          '55.123456, -1.234567',
          '55.223456, -1.334567',
          '55.323456, -1.434567'
        ]
      }
    }
  },
  {
    name: 'Polygon site with OSGB36 coordinates',
    exemption: createPolygonExemption(
      COORDINATE_SYSTEMS.OSGB36,
      mockPolygonCoordinatesOSGB36
    ),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Manually enter multiple sets of coordinates to mark the boundary of the site',
        'Coordinate system': 'OSGB36 (National Grid) Eastings and Northings'
      },
      siteDetailsExtended: {
        expectedRowCount: 6, // Method + Coordinate System + 3 coordinate points + map
        coordinatePoints: ['123456, 654321', '123556, 654421', '123656, 654521']
      }
    }
  },
  {
    name: 'Exemption with no public register inclusion',
    exemption: createSubmittedExemption({
      publicRegister: {
        consent: 'yes',
        reason: 'Lorem ipsum dolor sit amet'
      },
      siteDetails: {
        coordinatesType: 'coordinates',
        coordinatesEntry: 'single',
        coordinateSystem: COORDINATE_SYSTEMS.WGS84,
        coordinates: { latitude: '51.489676', longitude: '-0.231530' },
        circleWidth: '100'
      }
    }),
    expectedPageContent: {
      ...baseExpectedContent,
      siteDetails: {
        'Method of providing site location':
          'Manually enter one set of coordinates and a width to create a circular site',
        'Coordinate system':
          'WGS84 (World Geodetic System 1984) Latitude and longitude',
        'Coordinates at centre of site': '51.489676, -0.231530',
        'Width of circular site': '100 metres'
      },
      publicRegister: {
        'Information withheld from public register': 'Yes',
        'Why the information should be withheld': 'Lorem ipsum dolor sit amet'
      }
    }
  }
]
