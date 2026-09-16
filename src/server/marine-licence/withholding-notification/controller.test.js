import { vi } from 'vitest'
import { setupTestServer } from '#tests/integration/shared/test-setup-helpers.js'
import { getMarineLicenceService } from '#src/services/marine-licence-service/index.js'
import { getUserSession } from '#src/server/common/plugins/auth/utils.js'
import {
  authenticatedPostRequest,
  getAuthProvider
} from '#src/server/common/helpers/authenticated-requests.js'
import {
  makeGetRequest,
  makePostRequest
} from '#src/server/test-helpers/server-requests.js'
import { mockSubmittedMarineLicenceApplication } from '#src/server/test-helpers/mocks/marine-licence-mocks.js'
import { routes } from '#src/server/common/constants/routes.js'
import { APPLICATION_TASK_TYPE } from '#src/server/common/helpers/marine-licence/application-tasks/registry.js'

vi.mock('#src/services/marine-licence-service/index.js')
vi.mock('#src/server/common/plugins/auth/utils.js')
vi.mock('#src/server/common/helpers/authenticated-requests.js', () => ({
  getAuthProvider: vi.fn().mockReturnValue('defra-id'),
  authenticatedPostRequest: vi.fn().mockResolvedValue({})
}))

const CONTACT_ID = 'contact-1'
const MARINE_LICENCE_ID = '507f1f77bcf86cd799439011'
const TASK_ID = '507f1f77bcf86cd799439012'

const buildLicence = (data, overrides = {}) => ({
  ...mockSubmittedMarineLicenceApplication,
  id: MARINE_LICENCE_ID,
  contactId: CONTACT_ID,
  applicationTasks: [
    {
      taskId: TASK_ID,
      type: APPLICATION_TASK_TYPE.WITHHOLDING_NOTIFICATION,
      receivedAt: '2026-08-14T10:00:00.000Z',
      resolvedAt: null,
      data
    }
  ],
  ...overrides
})

describe('withholding notification controller', () => {
  const getServer = setupTestServer()
  let mockService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthProvider).mockReturnValue('defra-id')
    vi.mocked(authenticatedPostRequest).mockResolvedValue({})
    vi.mocked(getUserSession).mockResolvedValue({ contactId: CONTACT_ID })
    mockService = {
      getMarineLicenceById: vi.fn().mockResolvedValue(
        buildLicence({
          nationalSecurity: { withheldSome: false, comments: 'NS comments' },
          commercialConfidentiality: {
            withheldSome: true,
            comments: 'CC comments'
          }
        })
      )
    }
    vi.mocked(getMarineLicenceService).mockReturnValue(mockService)
  })

  const get = () =>
    makeGetRequest({
      url: `/marine-licence/withholding-notification/${MARINE_LICENCE_ID}`,
      server: getServer()
    })

  describe('GET', () => {
    test('renders both sections with the caseworker decisions and comments', async () => {
      const { statusCode, result } = await get()

      expect(statusCode).toBe(200)
      expect(result).toContain('Update on the information you asked us to withhold')
      expect(result).toContain('National security')
      expect(result).toContain(
        'We&#39;ve decided not to withhold the information you asked us to.'
      )
      expect(result).toContain('NS comments')
      expect(result).toContain('Commercial or industrial confidentiality')
      expect(result).toContain(
        'We&#39;ve agreed to withhold some of the information you asked us to.'
      )
      expect(result).toContain('CC comments')
    })

    test('omits commercial confidentiality when it was not flagged', async () => {
      mockService.getMarineLicenceById.mockResolvedValue(
        buildLicence({
          nationalSecurity: { withheldSome: true, comments: 'NS only' }
        })
      )

      const { result } = await get()

      expect(result).toContain('National security')
      expect(result).not.toContain('Commercial or industrial confidentiality')
    })

    test('omits national security when it was not flagged', async () => {
      mockService.getMarineLicenceById.mockResolvedValue(
        buildLicence({
          commercialConfidentiality: { withheldSome: false, comments: 'CC only' }
        })
      )

      const { result } = await get()

      expect(result).toContain('Commercial or industrial confidentiality')
      expect(result).not.toContain('>National security<')
    })

    test('links the withdraw wording to the submissions page', async () => {
      const { result } = await get()

      expect(result).toContain(
        `href="${routes.DASHBOARD}">withdraw your application from your Submissions page</a>`
      )
    })

    test('the back link returns to view details and changes nothing', async () => {
      const { result } = await get()

      expect(result).toContain(
        `href="/marine-licence/view-details/${MARINE_LICENCE_ID}"`
      )
      expect(authenticatedPostRequest).not.toHaveBeenCalled()
    })

    test('forbids anyone who did not submit the application', async () => {
      vi.mocked(getUserSession).mockResolvedValue({ contactId: 'someone-else' })

      const { statusCode } = await get()

      expect(statusCode).toBe(403)
    })

    test('forbids a request with no signed-in user', async () => {
      vi.mocked(getUserSession).mockResolvedValue(null)

      const { statusCode } = await get()

      expect(statusCode).toBe(403)
    })

    test('redirects to view details when there is no withholding task', async () => {
      mockService.getMarineLicenceById.mockResolvedValue(
        buildLicence({}, { applicationTasks: [] })
      )

      const { statusCode, headers } = await get()

      expect(statusCode).toBe(302)
      expect(headers.location).toBe(
        `/marine-licence/view-details/${MARINE_LICENCE_ID}`
      )
    })
  })

  describe('POST', () => {
    const post = (formData) =>
      makePostRequest({
        url: '/marine-licence/withholding-notification',
        server: getServer(),
        formData: { marineLicenceId: MARINE_LICENCE_ID, taskId: TASK_ID, ...formData }
      })

    test('marks the task as read and returns to view details', async () => {
      const { statusCode, headers } = await post()

      expect(authenticatedPostRequest).toHaveBeenCalledWith(
        expect.anything(),
        `/marine-licence/${MARINE_LICENCE_ID}/application-tasks/${TASK_ID}/resolve`,
        {}
      )
      expect(statusCode).toBe(302)
      expect(headers.location).toBe(
        `/marine-licence/view-details/${MARINE_LICENCE_ID}`
      )
    })

    test('still returns to view details when the API call fails', async () => {
      vi.mocked(authenticatedPostRequest).mockRejectedValue(new Error('boom'))

      const { statusCode, headers } = await post()

      expect(statusCode).toBe(302)
      expect(headers.location).toBe(
        `/marine-licence/view-details/${MARINE_LICENCE_ID}`
      )
    })

    test('redirects to the dashboard when the payload is invalid', async () => {
      const { statusCode, headers } = await post({ taskId: 'not-an-id' })

      expect(authenticatedPostRequest).not.toHaveBeenCalled()
      expect(statusCode).toBe(302)
      expect(headers.location).toBe(routes.DASHBOARD)
    })
  })
})
