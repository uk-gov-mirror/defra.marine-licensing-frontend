import { testScenarios } from './fixtures.js'
import {
  validatePageStructure,
  validateAllSummaryCardsExist,
  validateProjectDetails,
  validateActivityDates,
  validateActivityDetails,
  validateSiteDetails,
  validatePublicRegister
} from '../shared/summary-card-validators.js'
import { validateReadOnlyBehavior } from '../shared/dom-helpers.js'
import {
  mockExemption,
  responseToDocument,
  setupTestServer,
  validateResponse
} from '../shared/test-setup-helpers.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

jest.mock('~/src/server/common/helpers/authenticated-requests.js')

describe('View Details - Content Verification Integration Tests', () => {
  const getServer = setupTestServer()

  const getPageDocument = async (exemption) => {
    mockExemption(exemption)
    const response = await getServer().inject({
      method: 'GET',
      url: `${routes.VIEW_DETAILS}/${exemption.id}`
    })

    validateResponse(response, statusCodes.ok)
    return responseToDocument(response)
  }

  test.each(testScenarios)(
    '$name - validates every element on the page',
    async ({ exemption, expectedPageContent }) => {
      const document = await getPageDocument(exemption)

      validatePageStructure(document, expectedPageContent)
      validateAllSummaryCardsExist(document, expectedPageContent)
      validateProjectDetails(document, expectedPageContent)
      validateActivityDates(document, expectedPageContent)
      validateActivityDetails(document, expectedPageContent)
      validateSiteDetails(document, expectedPageContent)
      validatePublicRegister(document, expectedPageContent)
      validateReadOnlyBehavior(document)
    }
  )
})
