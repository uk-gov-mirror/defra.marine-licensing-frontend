import { vi } from 'vitest'
import {
  publicRegisterBrowseController,
  PUBLIC_REGISTER_VIEW_ROUTE
} from './controller.js'
import { publicRegisterGetRequest } from '#src/server/common/helpers/public-register-requests.js'
import { routes } from '#src/server/common/constants/routes.js'
import { formatEntriesForDisplay } from './utils.js'

vi.mock('#src/server/common/helpers/public-register-requests.js')

describe('#publicRegisterBrowseController', () => {
  const publicRegisterGetRequestMock = vi.mocked(publicRegisterGetRequest)

  const createRequest = () => ({
    h: { view: vi.fn() },
    request: {
      logger: { error: vi.fn() }
    }
  })

  test('renders the public register with sorted entries', async () => {
    const entries = [
      {
        applicationId: 'abc123',
        applicationType: 'exemption',
        applicationReference: 'EXE/2026/00012',
        projectName: 'South coast sea samples',
        marinePlanAreas: ['South'],
        dateSubmitted: '2026-03-18',
        status: 'Active'
      }
    ]

    publicRegisterGetRequestMock.mockResolvedValueOnce({
      payload: entries
    })

    const { h, request } = createRequest()

    await publicRegisterBrowseController.handler(request, h)

    expect(publicRegisterGetRequestMock).toHaveBeenCalledWith(
      request,
      '/application-submissions'
    )
    expect(h.view).toHaveBeenCalledWith(PUBLIC_REGISTER_VIEW_ROUTE, {
      pageTitle: 'Public register - Get permission for marine work',
      heading: 'Public register',
      resultCount: 1,
      rows: formatEntriesForDisplay(entries),
      serviceUrl: routes.PUBLIC_REGISTER_BROWSE
    })
  })

  test('supports wrapped API responses', async () => {
    publicRegisterGetRequestMock.mockResolvedValueOnce({
      payload: {
        value: [
          {
            applicationId: 'abc123',
            applicationType: 'exemption',
            applicationReference: 'EXE/2026/00012'
          }
        ]
      }
    })

    const { h, request } = createRequest()

    await publicRegisterBrowseController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      PUBLIC_REGISTER_VIEW_ROUTE,
      expect.objectContaining({
        resultCount: 1
      })
    )
  })

  test('renders an empty state when the API call fails', async () => {
    publicRegisterGetRequestMock.mockRejectedValueOnce(new Error('network'))

    const { h, request } = createRequest()

    await publicRegisterBrowseController.handler(request, h)

    expect(request.logger.error).toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(PUBLIC_REGISTER_VIEW_ROUTE, {
      pageTitle: 'Public register - Get permission for marine work',
      heading: 'Public register',
      resultCount: 0,
      rows: [],
      serviceUrl: routes.PUBLIC_REGISTER_BROWSE,
      errorLoading: true
    })
  })
})
