import { ROUTE_PREFIX } from '#src/server/self-service/constants.js'
import { firstQuestionRoute } from '#src/server/self-service/services/journey-loader.js'
import {
  initialiseJourney,
  clearJourney
} from '#src/server/self-service/services/session-answers.js'

const VIEW_PATH = 'self-service/views/start'

export const startController = {
  options: {
    auth: false // Self-service journey is entirely public, no authentication required
  },
  handler(_request, h) {
    return h.view(VIEW_PATH, {
      pageTitle: 'Check if you need a marine licence'
    })
  }
}

export const startSubmitController = {
  options: {
    auth: false // Self-service journey is entirely public, no authentication required
  },
  async handler(request, h) {
    await clearJourney(request, h)
    await initialiseJourney(request, h)
    return h.redirect(`${ROUTE_PREFIX}${firstQuestionRoute}`)
  }
}
