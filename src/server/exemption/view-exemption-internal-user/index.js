import { routes } from '~/src/server/common/constants/routes.js'
import { viewDetailsController } from '~/src/server/exemption/view-details/controller.js'

export const viewExemptionInternalUser = {
  plugin: {
    name: 'viewExemptionInternalUser',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: `${routes.VIEW_DETAILS_INTERNAL_USER}/{exemptionId}`,
          ...viewDetailsController
        }
      ])
    }
  }
}
