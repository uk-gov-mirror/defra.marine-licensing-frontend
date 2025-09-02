import { faker } from '@faker-js/faker'
import { COORDINATE_SYSTEMS } from '~/src/server/common/constants/exemptions.js'

export const mockExemptionTaskList = {
  projectName: 'COMPLETED',
  activityDates: 'COMPLETED',
  publicRegister: 'COMPLETED',
  siteDetails: 'COMPLETED'
}

export const mockExemption = {
  id: faker.database.mongodbObjectId(),
  projectName: 'Test Project',
  activityDates: {
    start: '2025-01-01T00:00:00.000Z',
    end: '2025-01-01T00:00:00.000Z'
  },
  activityDescription: 'Test activity description',
  // consent:yes: means consent to withdraw the application from the public register
  publicRegister: { consent: 'yes', reason: 'Test reason' },
  multipleSiteDetails: {
    multipleSitesEnabled: false,
    sameActivityDates: 'yes'
  },
  siteDetails: {
    coordinatesType: 'coordinates',
    coordinatesEntry: 'single',
    coordinateSystem: COORDINATE_SYSTEMS.WGS84,
    coordinates: { latitude: '51.489676', longitude: '-0.231530' },
    circleWidth: '100',
    siteName: 'Mock site'
  },
  taskList: mockExemptionTaskList
}

export const mockExemptionWithShapefile = {
  ...mockExemption,
  siteDetails: { ...mockExemption.siteDetails, fileUploadType: 'shapefile' }
}

export const mockExemptionNoSiteDetails = {
  ...mockExemption,
  siteDetails: null,
  multipleSiteDetails: null,
  taskList: null
}

export const mockExemptionWithUploadConfig = {
  ...mockExemption,
  siteDetails: {
    ...mockExemption.siteDetails,
    uploadConfig: {
      uploadId: 'test-upload-id',
      statusUrl: 'test-status-url',
      fileType: 'kml'
    }
  }
}

export const mockProjectList = [
  {
    id: 'abc123',
    projectName: 'Test Project',
    reference: 'ML-2024-001',
    status: 'Draft',
    submittedAt: null
  }
]
