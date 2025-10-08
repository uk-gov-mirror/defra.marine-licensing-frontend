import { vi } from 'vitest'
import {
  setupTestServer,
  mockExemption
} from '#tests/integration/shared/test-setup-helpers.js'
import { statusCodes } from '#src/server/common/constants/status-codes.js'
import { config } from '#src/config/config.js'
import { JSDOM } from 'jsdom'
import {
  taskListController,
  TASK_LIST_VIEW_ROUTE
} from '#src/server/exemption/task-list/controller.js'
import { mockExemption as mockExemptionData } from '#src/server/test-helpers/mocks.js'
import { makeGetRequest } from '#src/server/test-helpers/server-requests.js'
import { routes } from '#src/server/common/constants/routes.js'

describe('#taskListController', () => {
  const getServer = setupTestServer()

  const mockExemptionState = { projectName: 'Test Project' }

  beforeEach(() => mockExemption(mockExemptionData))

  test('Should provide expected response when loading page', async () => {
    const { result, statusCode } = await makeGetRequest({
      url: routes.TASK_LIST,
      server: getServer()
    })

    expect(result).toEqual(
      expect.stringContaining(`Task list | ${config.get('serviceName')}`)
    )

    const { document } = new JSDOM(result).window

    expect(document.querySelector('h1').textContent.trim()).toBe(
      mockExemptionState.projectName
    )

    expect(document.querySelector('.govuk-caption-l').textContent.trim()).toBe(
      'Exempt activity notification'
    )

    expect(
      document.querySelectorAll('.govuk-task-list__link')[0].textContent.trim()
    ).toBe('Project name')

    expect(
      document
        .querySelectorAll('.govuk-task-list__status')[0]
        .textContent.trim()
    ).toBe('Completed')

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('taskListController handler should render with correct context', async () => {
    const h = { view: vi.fn() }
    const { authenticatedGetRequest, setExemptionCache } =
      mockExemption(mockExemptionData)

    await taskListController.handler({}, h)

    expect(authenticatedGetRequest).toHaveBeenCalledWith(
      expect.any(Object),
      `/exemption/${mockExemptionData.id}`
    )

    const exemptionWithoutTaskList = { ...mockExemptionData }
    delete exemptionWithoutTaskList.taskList
    delete exemptionWithoutTaskList.mcmsContext

    expect(setExemptionCache).toHaveBeenCalledWith({}, exemptionWithoutTaskList)

    expect(h.view).toHaveBeenCalledWith(TASK_LIST_VIEW_ROUTE, {
      pageTitle: 'Task list',
      heading: 'Task list',
      type: 'Exempt activity notification',
      projectName: 'Test Project',
      taskList: [
        {
          href: routes.PROJECT_NAME,
          status: {
            text: 'Completed'
          },
          title: {
            text: 'Project name'
          }
        },
        {
          href: routes.ACTIVITY_DATES,
          status: {
            text: 'Completed'
          },
          title: {
            text: 'Activity dates'
          }
        },
        {
          href: routes.ACTIVITY_DESCRIPTION,
          status: {
            tag: {
              classes: 'govuk-tag--blue',
              text: 'Incomplete'
            }
          },
          title: {
            text: 'Activity description'
          }
        },
        {
          href: routes.REVIEW_SITE_DETAILS,
          status: {
            text: 'Completed'
          },
          title: {
            text: 'Site details'
          }
        },
        {
          href: routes.PUBLIC_REGISTER,
          status: {
            text: 'Completed'
          },
          title: {
            text: 'Public register'
          }
        }
      ],
      hasCompletedAllTasks: false
    })
  })

  test('taskListController handler should correctly handle request to clear cache and redirect', async () => {
    const { resetExemptionSiteDetails } = mockExemption(mockExemptionData)

    const { statusCode, headers } = await makeGetRequest({
      url: `${routes.TASK_LIST}?cancel=site-details`,
      server: getServer()
    })

    expect(resetExemptionSiteDetails).toHaveBeenCalled()
    expect(statusCode).toBe(302)
    expect(headers.location).toBe(routes.TASK_LIST)
  })

  test('taskListController should redirect when cancel query parameter is provided but does not match', async () => {
    const { resetExemptionSiteDetails } = mockExemption(mockExemptionData)

    const { statusCode, headers } = await makeGetRequest({
      url: `${routes.TASK_LIST}?cancel=does-not-exist`,
      server: getServer()
    })

    expect(resetExemptionSiteDetails).not.toHaveBeenCalled()
    expect(statusCode).toBe(302)
    expect(headers.location).toBe(routes.TASK_LIST)
  })

  test('taskListController handler should throw a 404 if exemption is not found', async () => {
    const h = { view: vi.fn() }

    mockExemption(null)

    await expect(() => taskListController.handler({}, h)).rejects.toThrow(
      `Exemption not found`,
      mockExemptionData.id
    )
  })

  test('taskListSelectExemptionController should clear cache and return to task list', async () => {
    const { clearExemptionCache, setExemptionCache } =
      mockExemption(mockExemptionData)

    const { statusCode, headers } = await makeGetRequest({
      url: '/exemption/task-list/abc123?from=dashboard',
      server: getServer()
    })

    expect(clearExemptionCache).toHaveBeenCalled()

    expect(setExemptionCache).toHaveBeenCalledWith(expect.any(Object), {
      id: 'abc123'
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/exemption/task-list')
  })
})
