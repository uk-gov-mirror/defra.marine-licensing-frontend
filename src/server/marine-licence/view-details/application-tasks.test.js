import { vi } from 'vitest'
import { setupTestServer } from '#tests/integration/shared/test-setup-helpers.js'
import { getMarineLicenceService } from '#src/services/marine-licence-service/index.js'
import { getUserSession } from '#src/server/common/plugins/auth/utils.js'
import { getAuthProvider } from '#src/server/common/helpers/authenticated-requests.js'
import { makeGetRequest } from '#src/server/test-helpers/server-requests.js'
import { mockSubmittedMarineLicenceApplication } from '#src/server/test-helpers/mocks/marine-licence-mocks.js'
import { APPLICATION_TASK_TYPE } from '#src/server/common/helpers/marine-licence/application-tasks/registry.js'

vi.mock('#src/services/marine-licence-service/index.js')
vi.mock('#src/server/common/plugins/auth/utils.js')
vi.mock('#src/server/common/helpers/authenticated-requests.js', () => ({
  getAuthProvider: vi.fn().mockReturnValue('defra-id')
}))

const CONTACT_ID = 'contact-1'
const MARINE_LICENCE_ID = '507f1f77bcf86cd799439011'
const TASK_ID = '507f1f77bcf86cd799439012'
const ATTENTION_HEADING = 'Things that require your attention'
const TASK_TITLE = 'Notification about withholding information'

const buildLicence = (applicationTasks) => ({
  ...mockSubmittedMarineLicenceApplication,
  id: MARINE_LICENCE_ID,
  contactId: CONTACT_ID,
  applicationTasks
})

const buildTask = (resolvedAt = null) => ({
  taskId: TASK_ID,
  type: APPLICATION_TASK_TYPE.WITHHOLDING_NOTIFICATION,
  receivedAt: '2026-08-14T10:00:00.000Z',
  resolvedAt,
  data: {}
})

describe('view details - things that require your attention', () => {
  const getServer = setupTestServer()
  let mockService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthProvider).mockReturnValue('defra-id')
    vi.mocked(getUserSession).mockResolvedValue({ contactId: CONTACT_ID })
    mockService = {
      getMarineLicenceById: vi
        .fn()
        .mockResolvedValue(buildLicence([buildTask()])),
      getPublicMarineLicenceById: vi
        .fn()
        .mockResolvedValue(buildLicence([buildTask()]))
    }
    vi.mocked(getMarineLicenceService).mockReturnValue(mockService)
  })

  const get = (path = '/marine-licence/view-details') =>
    makeGetRequest({
      url: `${path}/${MARINE_LICENCE_ID}`,
      server: getServer()
    })

  test('shows the section and the not yet read task to the original submitter', async () => {
    const { result } = await get()

    expect(result).toContain(ATTENTION_HEADING)
    expect(result).toContain(TASK_TITLE)
    expect(result).toContain('Not yet read')
    expect(result).toContain(
      `/marine-licence/withholding-notification/${MARINE_LICENCE_ID}`
    )
  })

  test('shows the task as Read once it has been marked as read', async () => {
    mockService.getMarineLicenceById.mockResolvedValue(
      buildLicence([buildTask('2026-08-15T10:00:00.000Z')])
    )

    const { result } = await get()

    expect(result).toContain(ATTENTION_HEADING)
    expect(result).not.toContain('Not yet read')
  })

  test('hides the section from another person in the same organisation', async () => {
    vi.mocked(getUserSession).mockResolvedValue({ contactId: 'someone-else' })

    const { result } = await get()

    expect(result).not.toContain(ATTENTION_HEADING)
    expect(result).not.toContain(TASK_TITLE)
  })

  test('hides the section on the public view', async () => {
    const { result } = await get('/marine-licence/view-public-details')

    expect(result).not.toContain(ATTENTION_HEADING)
    expect(result).not.toContain(TASK_TITLE)
  })

  test('hides the section when there are no tasks', async () => {
    mockService.getMarineLicenceById.mockResolvedValue(buildLicence([]))

    const { result } = await get()

    expect(result).not.toContain(ATTENTION_HEADING)
  })
})
