import { ROUTE_PREFIX, START_PATH } from '#src/server/self-service/constants.js'

const SESSION_KEY = 'selfServiceJourney'

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {object | null}
 */
export function getJourneyState(request) {
  return request.yar.get(SESSION_KEY) ?? null
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export async function initialiseJourney(request, h) {
  request.yar.set(SESSION_KEY, {
    startedAt: new Date().toISOString(),
    answers: []
  })
  await request.yar.commit(h)
}

/**
 * Push new answers, first removing any answers from the point
 * where this question was previously answered (deleteFutureAnswers).
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {object[]} newAnswers
 */
export async function pushAnswers(request, h, newAnswers) {
  const state = getJourneyState(request)
  deleteFutureAnswers(state, newAnswers[0].questionRoute)
  state.answers.push(...newAnswers)
  request.yar.set(SESSION_KEY, state)
  await request.yar.commit(h)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {string} questionRoute
 * @returns {object[]}
 */
export function getAnswersForRoute(request, questionRoute) {
  const state = getJourneyState(request)
  if (!state) {
    return []
  }
  return state.answers.filter((a) => a.questionRoute === questionRoute)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {string} currentRoute - the route of the page being rendered (e.g. '/sea')
 * @returns {string}
 */
export function getBackLink(request, currentRoute) {
  const state = getJourneyState(request)
  if (!state || state.answers.length === 0) {
    return START_PATH
  }

  const index = state.answers.findIndex((a) => a.questionRoute === currentRoute)

  if (index > 0) {
    return `${ROUTE_PREFIX}${state.answers[index - 1].questionRoute}`
  }

  if (index === 0) {
    return START_PATH
  }

  // Current route not yet answered — back to the last answered question
  const lastAnswer = state.answers[state.answers.length - 1]
  return `${ROUTE_PREFIX}${lastAnswer.questionRoute}`
}

/**
 * Delete the answer for the given question route and all subsequent answers.
 * This handles the user navigating back and choosing a different answer.
 *
 * @param {object} state
 * @param {string} questionRoute
 */
function deleteFutureAnswers(state, questionRoute) {
  const firstIndex = state.answers.findIndex(
    (a) => a.questionRoute === questionRoute
  )
  if (firstIndex !== -1) {
    state.answers.splice(firstIndex)
  }
}

/**
 * Delete future answers from a specific outcome route onwards.
 * Used when reaching a terminal outcome to trim any stale answers
 * from a previous branch.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {string} outcomeRoute
 */
export async function deleteFutureAnswersFromOutcome(request, h, outcomeRoute) {
  const state = getJourneyState(request)
  if (!state) {
    return
  }
  const firstIndex = state.answers.findIndex(
    (a) => a.questionRoute === outcomeRoute
  )
  if (firstIndex !== -1) {
    state.answers.splice(firstIndex)
    request.yar.set(SESSION_KEY, state)
    await request.yar.commit(h)
  }
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export async function clearJourney(request, h) {
  request.yar.clear(SESSION_KEY)
  await request.yar.commit(h)
}
