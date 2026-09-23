import { getByRole } from '@testing-library/dom'
import { marineLicenceRoutes } from '~/src/server/common/constants/routes.js'
import {
  mockMarineLicence,
  setupTestServer
} from '~/tests/integration/shared/test-setup-helpers.js'
import { loadPage } from '~/tests/integration/shared/app-server.js'
import {
  mockRejectedMarineLicenceApplication,
  mockSubmittedMarineLicenceApplication,
  mockTransferredMarineLicenceApplication
} from '~/src/server/test-helpers/mocks/marine-licence-mocks.js'
import {
  expectedProjectDetailsCard,
  expectedRejectedApplicationDetailsCard,
  expectedSubmittedApplicationDetailsCard,
  expectedTransferredApplicationDetailsCard
} from './fixtures.js'
import { getCardRow } from './utils.js'
import { toApplicationReferenceUrlSegment } from '~/src/server/common/helpers/marine-licence/application-reference-url-segment.js'
import { getAuthProvider } from '~/src/server/common/helpers/authenticated-requests.js'
import { AUTH_STRATEGIES } from '~/src/server/common/constants/auth.js'
import { REDACTION_LABEL } from '~/src/server/common/helpers/marine-licence/redaction-label.js'

vi.mock('~/src/server/common/helpers/authenticated-requests.js')

const referenceUrl = toApplicationReferenceUrlSegment(
  mockSubmittedMarineLicenceApplication.applicationReference
)
const previewUrl =
  marineLicenceRoutes.MARINE_LICENCE_REDACTION_PREVIEW.replace(
    '{applicationReference}',
    referenceUrl
  )

describe('Marine licence redaction preview', () => {
  const getServer = setupTestServer()

  const loadPreview = (marineLicence) => {
    vi.mocked(getAuthProvider).mockReturnValue(AUTH_STRATEGIES.ENTRA_ID)
    mockMarineLicence(marineLicence)

    return loadPage({
      requestUrl: previewUrl,
      server: getServer()
    })
  }

  test('shows the project name, reference and preview notice', async () => {
    const document = await loadPreview(mockSubmittedMarineLicenceApplication)

    expect(getByRole(document, 'heading', { level: 1 })).toHaveTextContent(
      mockSubmittedMarineLicenceApplication.projectName
    )
    expect(document.querySelector('.govuk-caption-l').textContent).toBe(
      mockSubmittedMarineLicenceApplication.applicationReference
    )
    expect(document.querySelector('#redaction-preview-notice').textContent).toContain(
      'This is a preview of how the application will appear on the public register.'
    )
    expect(document.querySelector('.app-redaction-label')).toBeNull()
  })

  test('shows the same project details as the standard page when nothing is redacted', async () => {
    const document = await loadPreview(mockSubmittedMarineLicenceApplication)
    const card = document.querySelector('#project-details-card')

    expect(
      getCardRow(card, 'Project name')
        .querySelector('.govuk-summary-list__value')
        .textContent.trim()
    ).toBe(mockSubmittedMarineLicenceApplication.projectName)

    for (const { key, value } of expectedProjectDetailsCard.rows) {
      expect(
        getCardRow(card, key)
          .querySelector('.govuk-summary-list__value')
          .textContent.trim()
      ).toBe(value)
    }

    expect(card.querySelector('.govuk-summary-card__actions a')).toBeNull()
  })

  test.each([
    ['submitted', mockSubmittedMarineLicenceApplication, expectedSubmittedApplicationDetailsCard],
    ['transferred', mockTransferredMarineLicenceApplication, expectedTransferredApplicationDetailsCard],
    ['rejected', mockRejectedMarineLicenceApplication, expectedRejectedApplicationDetailsCard]
  ])(
    'renders the application overview for a %s licence',
    async (_status, marineLicence, expectedCard) => {
      const document = await loadPreview(marineLicence)
      const card = document.querySelector('#application-overview-card')

      expect(card).not.toBeNull()

      for (const { key, value } of expectedCard.rows) {
        const row = getCardRow(card, key)

        expect(row).toBeTruthy()
        expect(
          row
            .querySelector('.govuk-summary-list__value')
            .textContent.replace(/\s+/g, ' ')
            .trim()
        ).toBe(value)
      }
    }
  )

  describe('redacted data', () => {
    const cardValue = (document, cardSelector, row) =>
      getCardRow(document.querySelector(cardSelector), row).querySelector(
        '.govuk-summary-list__value'
      )

    const redactedCriteria = [
      {
        field: 'project name',
        redactions: {
          projectName: { redactedText: `Harbour ${REDACTION_LABEL} works` }
        },
        card: '#project-details-card',
        row: 'Project name',
        published: `Harbour ${REDACTION_LABEL} works`,
        heading: true
      },
      {
        field: 'project background',
        redactions: {
          projectBackground: { redactedText: `Works at ${REDACTION_LABEL}` }
        },
        card: '#project-details-card',
        row: 'Project background',
        published: `Works at ${REDACTION_LABEL}`
      },
      {
        field: 'preferred dates',
        redactions: {
          preferredDates: { redactedText: `From ${REDACTION_LABEL}` }
        },
        card: '#project-details-card',
        row: 'Preferred start and end dates of the licence',
        published: `From ${REDACTION_LABEL}`
      }
    ]

    test.each(redactedCriteria)(
      'publishes the redacted $field',
      async ({ redactions, card, row, published, heading }) => {
        const document = await loadPreview({
          ...mockSubmittedMarineLicenceApplication,
          redactions
        })
        const value = cardValue(document, card, row)

        expect(value.textContent.trim()).toBe(published)
        expect(value.querySelector('.app-redaction-label').textContent).toBe(
          REDACTION_LABEL
        )

        if (heading) {
          const pageHeading = document.querySelector('#redaction-preview-heading')

          expect(pageHeading.textContent).toBe(published)
          expect(
            pageHeading.querySelector('.app-redaction-label').textContent
          ).toBe(REDACTION_LABEL)
        }
      }
    )
  })
})
