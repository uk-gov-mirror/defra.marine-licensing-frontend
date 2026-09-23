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
  expectedRejectedApplicationDetailsCard,
  expectedSubmittedApplicationDetailsCard,
  expectedTransferredApplicationDetailsCard
} from './fixtures.js'
import { getCardRow } from './utils.js'
import { toApplicationReferenceUrlSegment } from '~/src/server/common/helpers/marine-licence/application-reference-url-segment.js'
import { getAuthProvider } from '~/src/server/common/helpers/authenticated-requests.js'
import { AUTH_STRATEGIES } from '~/src/server/common/constants/auth.js'

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

  test('uses the redacted project name when one is stored', async () => {
    const document = await loadPreview({
      ...mockSubmittedMarineLicenceApplication,
      redactions: {
        projectName: { redactedText: 'Harbour ***REDACTED*** works' }
      }
    })

    const heading = document.querySelector('#redaction-preview-heading')

    expect(heading.textContent).toBe('Harbour ***REDACTED*** works')
    expect(heading.querySelector('.app-redaction-label').textContent).toBe(
      '***REDACTED***'
    )
  })
})
