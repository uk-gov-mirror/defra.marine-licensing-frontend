import { routes } from '~/src/server/common/constants/routes.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
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
import { validateSubmissionSection } from '../shared/dom-helpers.js'
import {
  mockExemption,
  responseToDocument,
  setupTestServer,
  validateResponse
} from '../shared/test-setup-helpers.js'
import { mockExemptionMcmsContext } from '~/src/server/test-helpers/mocks.js'

jest.mock('~/src/server/common/helpers/authenticated-requests.js')

describe('Check your answers - page content Validation', () => {
  const getServer = setupTestServer()

  const getPageDocument = async (exemption) => {
    mockExemption({
      ...exemption,
      mcmsContext: mockExemptionMcmsContext
    })
    const response = await getServer().inject({
      method: 'GET',
      url: routes.CHECK_YOUR_ANSWERS
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
      validateSubmissionSection(document, expectedPageContent)
    }
  )
})
