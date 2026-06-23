import {
  taskListController,
  taskListSelectMarineLicenceController,
  calculatePoliciesController,
  savePolicyResponseController
} from '#src/server/marine-licence/task-list/controller.js'
import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'

export const taskListRoutes = [
  {
    method: 'GET',
    path: marineLicenceRoutes.MARINE_LICENCE_TASK_LIST,
    ...taskListController
  },
  {
    method: 'GET',
    path: marineLicenceRoutes.MARINE_LICENCE_TASK_LIST + '/{id}',
    ...taskListSelectMarineLicenceController
  },
  {
    method: 'POST',
    path: marineLicenceRoutes.MARINE_LICENCE_TASK_LIST,
    ...calculatePoliciesController
  },
  {
    method: 'POST',
    path:
      marineLicenceRoutes.MARINE_LICENCE_TASK_LIST +
      '/dev-save-policy-response',
    ...savePolicyResponseController
  }
]
