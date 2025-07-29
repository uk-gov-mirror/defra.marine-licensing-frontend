import {
  getExemptionCache,
  resetExemptionSiteDetails,
  clearExemptionCache,
  setExemptionCache
} from '~/src/server/common/helpers/session-cache/utils.js'
import { transformTaskList } from '~/src/server/exemption/task-list/utils.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { authenticatedGetRequest } from '~/src/server/common/helpers/authenticated-requests.js'

import Boom from '@hapi/boom'

export const TASK_LIST_VIEW_ROUTE = 'exemption/task-list/index'

const taskListViewSettings = {
  pageTitle: 'Task list',
  heading: 'Task list'
}

/**
 * A GDS styled task list page controller.
 * @satisfies {Partial<ServerRoute>}
 */
export const taskListController = {
  async handler(request, h) {
    const exemption = getExemptionCache(request)

    const { id } = exemption

    if (!id) {
      throw Boom.notFound(`Exemption not found`, { id })
    }

    const { query } = request

    if (query?.cancel) {
      if (query.cancel === 'site-details') {
        resetExemptionSiteDetails(request)
      }

      return h.redirect(routes.TASK_LIST)
    }

    const { payload } = await authenticatedGetRequest(
      request,
      `/exemption/${id}`
    )

    const {
      id: exemptionId,
      taskList,
      activityDates,
      activityDescription,
      projectName,
      publicRegister,
      siteDetails
    } = payload.value

    const taskListTransformed = transformTaskList(taskList)
    const hasCompletedAllTasks = taskListTransformed?.every(
      (task) => task.status.text === 'Completed'
    )

    setExemptionCache(request, {
      id: exemptionId,
      activityDates,
      activityDescription,
      projectName,
      publicRegister,
      siteDetails
    })

    return h.view(TASK_LIST_VIEW_ROUTE, {
      ...taskListViewSettings,
      projectName: payload.value.projectName,
      taskList: taskListTransformed,
      hasCompletedAllTasks
    })
  }
}

/**
 * Controller for selecting an exemption and redirecting to the task list.
 */
export const taskListSelectExemptionController = {
  handler(request, h) {
    const { exemptionId } = request.params
    clearExemptionCache(request)
    setExemptionCache(request, { id: exemptionId })
    return h.redirect(routes.TASK_LIST)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
