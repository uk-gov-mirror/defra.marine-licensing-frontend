import { createServer } from '~/src/server/index.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { config } from '~/src/config/config.js'
import { JSDOM } from 'jsdom'
import * as cacheUtils from '~/src/server/common/helpers/session-cache/utils.js'
import {
  taskListController,
  TASK_LIST_VIEW_ROUTE
} from '~/src/server/exemption/task-list/controller.js'
import { mockExemption } from '~/src/server/test-helpers/mocks.js'
import { routes } from '~/src/server/common/constants/routes.js'

import Wreck from '@hapi/wreck'

describe('#taskListController', () => {
  /** @type {Server} */
  let server
  let getExemptionCacheSpy

  const mockExemptionState = { projectName: 'Test Project' }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    jest.resetAllMocks()

    jest
      .spyOn(Wreck, 'get')
      .mockReturnValue({ payload: { value: mockExemption } })

    getExemptionCacheSpy = jest
      .spyOn(cacheUtils, 'getExemptionCache')
      .mockReturnValue(mockExemption)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response when loading page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: routes.TASK_LIST
    })

    expect(result).toEqual(
      expect.stringContaining(`Task list | ${config.get('serviceName')}`)
    )

    const { document } = new JSDOM(result).window

    expect(document.querySelector('h1').textContent.trim()).toBe(
      mockExemptionState.projectName
    )

    expect(document.querySelector('.govuk-caption-l').textContent.trim()).toBe(
      'Exempt activity'
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
    const h = { view: jest.fn() }

    await taskListController.handler({}, h)

    expect(Wreck.get).toHaveBeenCalledWith(
      `${config.get('backend').apiUrl}/exemption/${mockExemption.id}`,
      { json: true }
    )

    expect(h.view).toHaveBeenCalledWith(TASK_LIST_VIEW_ROUTE, {
      pageTitle: 'Task list',
      heading: 'Task list',
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
    const resetExemptionSiteDetailsSpy = jest.spyOn(
      cacheUtils,
      'resetExemptionSiteDetails'
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `${routes.TASK_LIST}?cancel=site-details`
    })

    expect(resetExemptionSiteDetailsSpy).toHaveBeenCalled()
    expect(statusCode).toBe(302)
    expect(headers.location).toBe(routes.TASK_LIST)
  })

  test('taskListController should redirect when cancel query parameter is provided but does not match', async () => {
    const resetExemptionSiteDetailsSpy = jest.spyOn(
      cacheUtils,
      'resetExemptionSiteDetails'
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `${routes.TASK_LIST}?cancel=does-not-exist`
    })

    expect(resetExemptionSiteDetailsSpy).not.toHaveBeenCalled()
    expect(statusCode).toBe(302)
    expect(headers.location).toBe(routes.TASK_LIST)
  })

  test('taskListController handler should throw a 404 if exemption is not found', async () => {
    const h = { view: jest.fn() }

    getExemptionCacheSpy.mockResolvedValueOnce(null)

    await expect(() => taskListController.handler({}, h)).rejects.toThrow(
      `Exemption not found`,
      mockExemption.id
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
