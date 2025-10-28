import { vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { getByText, within } from '@testing-library/dom'
import { COORDINATE_SYSTEMS } from '~/src/server/common/constants/exemptions.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import * as coordinateUtils from '~/src/server/common/helpers/coordinate-utils.js'
import { testScenarios } from './circular-site-fixtures.js'

import { makeGetRequest } from '~/src/server/test-helpers/server-requests.js'
import {
  mockExemption,
  setupTestServer
} from '~/tests/integration/shared/test-setup-helpers.js'
import * as exemptionService from '#src/services/exemption-service/index.js'
import {
  getRowByKey,
  getSiteDetailsCard,
  validateActionLink,
  validatePageStructure,
  validateNavigationElements
} from './review-site-details-utils.js'

vi.mock('~/src/server/common/helpers/coordinate-utils.js')
vi.mock('~/src/services/exemption-service/index.js')

describe('Review Site Details - Circular Coordinates Integration Tests', () => {
  const getServer = setupTestServer()
  let mockExemptionService

  beforeEach(() => {
    vi.spyOn(coordinateUtils, 'getCoordinateSystem').mockReturnValue({
      coordinateSystem: COORDINATE_SYSTEMS.WGS84
    })

    mockExemptionService = {
      getExemptionById: vi.fn().mockResolvedValue(testScenarios[0].exemption)
    }
    vi.mocked(exemptionService.getExemptionService).mockReturnValue(
      mockExemptionService
    )
  })

  test.each(testScenarios)(
    '$name - validates circular coordinate display',
    async ({ exemption, expectedPageContent, coordinateSystem }) => {
      if (coordinateSystem) {
        vi.spyOn(coordinateUtils, 'getCoordinateSystem').mockReturnValue({
          coordinateSystem
        })
      }

      const document = await getPageDocument(exemption)

      const isMultipleSites =
        exemption.multipleSiteDetails?.multipleSitesEnabled

      validatePageStructure(document, expectedPageContent)
      validateNavigationElements(document)

      validateSummaryCard(document, expectedPageContent)

      if (isMultipleSites) {
        validateMultSiteActivityDetailsCard(document, expectedPageContent)
        validateMultipleSites(document, expectedPageContent)

        for (const site of expectedPageContent.siteDetails.keys()) {
          validateCircularCoordinates(document, expectedPageContent, site)
          validateSiteDetailsCard(document, expectedPageContent, site)
        }
      } else {
        validateCircularCoordinates(document, expectedPageContent, 0)
        validateSiteDetailsCard(document, expectedPageContent, 0)
      }
    }
  )

  describe('Edge Cases', () => {
    test('should handle empty circular coordinates gracefully', async () => {
      const emptyCircularExemption = {
        id: 'test-exemption-empty',
        projectName: 'Empty Circular Project',
        multipleSiteDetails: {},
        siteDetails: [
          {
            coordinatesType: 'coordinates',
            coordinatesEntry: 'single',
            coordinateSystem: 'wgs84',
            coordinates: null,
            circleWidth: null
          }
        ]
      }

      const document = await getPageDocument(emptyCircularExemption)
      const summaryCard = getSiteDetailsCard(document)

      const methodRow = getRowByKey(
        summaryCard,
        'Single or multiple sets of coordinates'
      )
      expect(methodRow).toBeTruthy()
      expect(methodRow.textContent).toContain(
        'Manually enter one set of coordinates and a width to create a circular site'
      )
    })
  })

  const getPageDocument = async (exemption) => {
    mockExemption(exemption)

    mockExemptionService.getExemptionById.mockResolvedValue(exemption)

    const response = await makeGetRequest({
      server: getServer(),
      url: routes.REVIEW_SITE_DETAILS,
      headers: {
        referer: `http://localhost${routes.WIDTH_OF_SITE}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    return new JSDOM(response.result).window.document
  }

  const validateMultipleSites = (document, expected) => {
    const heading = document.querySelector('h1')
    expect(heading.textContent.trim()).toBe('Review site details')

    const caption = document.querySelector('.govuk-caption-l')
    expect(caption.textContent.trim()).toBe(expected.projectName)

    const cards = document.querySelectorAll('.govuk-summary-card')
    const siteDetailsCards = Array.from(cards).filter((card) =>
      card.textContent.match(/Site \d+ details/g)
    )
    expect(siteDetailsCards).toHaveLength(expected.siteDetails.length)

    expect(
      within(document).getByRole('button', {
        name: 'Add another site'
      })
    ).toHaveAttribute('type', 'submit')

    expect(
      getByText(
        document,
        `The site details you've provided are saved. You can return to this page and make changes at any time before you send your information.`
      )
    ).toBeInTheDocument()

    expect(
      within(document).getByRole('button', { name: 'Continue' })
    ).toHaveAttribute('type', 'submit')

    const backLink = document.querySelector('.govuk-back-link')
    expect(backLink.textContent.trim()).toBe('Back')
    expect(backLink.getAttribute('href')).toBe(routes.WIDTH_OF_SITE)
  }

  const validateSummaryCard = (document, expected) => {
    const siteLocationCard = document.querySelectorAll('.govuk-summary-card')[0]

    const siteLocationCardTitle = siteLocationCard.querySelector(
      '.govuk-summary-card__title'
    )

    expect(siteLocationCardTitle.textContent.trim()).toBe(
      'Providing the site location'
    )

    const actionList = siteLocationCard.querySelector(
      '.govuk-summary-card__actions'
    )
    expect(actionList).toBeTruthy()

    const deleteLink = within(actionList).getByRole('link', {
      name: /Delete all site details/i
    })

    expect(deleteLink).toHaveAttribute(
      'href',
      expect.stringContaining(`delete-all-sites`)
    )
  }

  const validateMultSiteActivityDetailsCard = (document, expected) => {
    const siteCard = document.querySelectorAll('.govuk-summary-card')[1]
    expect(siteCard).toBeTruthy()

    const cardTitle = within(siteCard).getByRole('heading', { level: 2 })
    expect(cardTitle.textContent.trim()).toBe('Activity details')

    const sameActivityDatesRow = getRowByKey(
      siteCard,
      'Are the activity dates the same for every site?'
    )
    expect(sameActivityDatesRow.textContent).toContain(
      expected.multipleSiteDetails.sameActivityDates
    )

    const activityDatesRow = getRowByKey(siteCard, 'Activity dates')

    expected.multipleSiteDetails.sameActivityDates === 'Yes'
      ? expect(activityDatesRow.textContent).toContain(
          expected.multipleSiteDetails.activityDates
        )
      : expect(activityDatesRow).toBeFalsy()

    const sameActivityDescriptionRow = getRowByKey(
      siteCard,
      'Is the activity description the same for every site?'
    )
    expect(sameActivityDescriptionRow.textContent).toContain(
      expected.multipleSiteDetails.sameActivityDescription
    )

    const activityDescriptionRow = getRowByKey(siteCard, 'Activity description')

    expected.multipleSiteDetails.sameActivityDescription === 'Yes'
      ? expect(activityDescriptionRow.textContent).toContain(
          expected.multipleSiteDetails.activityDescription
        )
      : expect(activityDescriptionRow).toBeFalsy()
  }

  const validateSiteDetailsCard = (document, expected, siteIndex) => {
    const siteCard = getSiteDetailsCard(document, expected, siteIndex)

    const cardTitle = siteCard.querySelector('.govuk-summary-card__title')
    expect(cardTitle.textContent.trim()).toBe(
      expected.siteDetails[siteIndex].cardName
    )

    const cardActions = siteCard.querySelector('.govuk-summary-card__actions')
    const deleteLink = within(cardActions).getByRole('link')
    expect(deleteLink.textContent).toContain('Delete site')

    const methodRow = getRowByKey(
      siteCard,
      'Single or multiple sets of coordinates'
    )
    expect(methodRow.textContent).toContain(
      expected.siteDetails[siteIndex].method
    )

    validateActionLink(
      methodRow,
      expected.siteDetails[siteIndex].method,
      siteIndex
    )

    const coordinateSystemRow = getRowByKey(siteCard, 'Coordinate system')
    expect(coordinateSystemRow.textContent).toContain(
      expected.siteDetails[siteIndex].coordinateSystem
    )

    validateActionLink(
      coordinateSystemRow,
      expected.siteDetails[siteIndex].coordinateSystem,
      siteIndex
    )

    const siteNameRow = getRowByKey(siteCard, 'Site name')

    if (expected.multipleSiteDetails.multipleSiteDetails === 'Yes') {
      expect(siteNameRow.textContent).toContain(
        expected.siteDetails[siteIndex].siteName
      )
      validateActionLink(
        siteNameRow,
        expected.siteDetails[siteIndex].siteName,
        siteIndex
      )
    } else {
      expect(siteNameRow).toBeFalsy()
    }

    const shouldIncludeActivityDates =
      expected.multipleSiteDetails.multipleSiteDetails === 'No' ||
      expected.multipleSiteDetails.sameActivityDates === 'No'

    const activityDatesRow = getRowByKey(siteCard, 'Activity dates')

    if (shouldIncludeActivityDates) {
      expect(activityDatesRow.textContent).toContain(
        expected.siteDetails[siteIndex].activityDates
      )
      validateActionLink(
        activityDatesRow,
        expected.siteDetails[siteIndex].activityDates,
        siteIndex
      )
    } else {
      expect(activityDatesRow).toBeFalsy()
    }

    const shouldIncludeActivityDescription =
      expected.multipleSiteDetails.multipleSiteDetails === 'No' ||
      expected.multipleSiteDetails.sameActivityDescription === 'No'

    const activityDescriptionRow = getRowByKey(siteCard, 'Activity description')

    if (shouldIncludeActivityDescription) {
      expect(activityDescriptionRow.textContent).toContain(
        expected.siteDetails[siteIndex].activityDescription
      )
      validateActionLink(
        activityDescriptionRow,
        expected.siteDetails[siteIndex].activityDescription,
        siteIndex
      )
    } else {
      expect(activityDescriptionRow).toBeFalsy()
    }
  }

  const validateCircularCoordinates = (document, expected, siteIndex) => {
    const siteCard = getSiteDetailsCard(document, expected, siteIndex)

    const centreRow = getRowByKey(siteCard, 'Coordinates at centre of site')
    expect(centreRow).toBeTruthy()
    expect(centreRow.textContent).toContain(
      expected.siteDetails[siteIndex].centreCoordinates
    )

    validateActionLink(
      centreRow,
      expected.siteDetails[siteIndex].centreCoordinates,
      siteIndex
    )

    const widthRow = getRowByKey(siteCard, 'Width of circular site')
    expect(widthRow).toBeTruthy()
    expect(widthRow.textContent).toContain(
      expected.siteDetails[siteIndex].circleWidth
    )

    validateActionLink(
      widthRow,
      expected.siteDetails[siteIndex].circleWidth,
      siteIndex
    )

    const mapViewRow = getRowByKey(siteCard, 'Map view')
    expect(mapViewRow).toBeTruthy()
    expect(mapViewRow.textContent.trim()).toBe('Map view')

    const mapDiv = mapViewRow.querySelector(
      '.app-site-details-map[data-module="site-details-map"]'
    )
    expect(mapDiv).toBeTruthy()
  }
})
