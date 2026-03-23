import { ROUTE_PREFIX, START_PATH } from '#src/server/self-service/constants.js'
import {
  getOutcome,
  getOutcomeType,
  getOutcomeTypesForOutcome,
  getSection
} from '#src/server/self-service/services/journey-loader.js'
import {
  getJourneyState,
  getBackLink,
  pushAnswers,
  deleteFutureAnswersFromOutcome
} from '#src/server/self-service/services/session-answers.js'

const VIEW_PATH = 'self-service/views/outcome'

export const outcomeController = {
  options: {
    auth: false
  },
  handler(request, h) {
    if (!getJourneyState(request)) {
      return h.redirect(START_PATH)
    }

    const outcomeRoute = '/' + request.params.outcomePath
    const outcome = getOutcome(outcomeRoute)
    const outcomeTypes = getOutcomeTypesForOutcome(outcome)
    const section = outcome.section ? getSection(outcome.section) : null
    const canContinue = outcomeTypes.some((ot) => ot.nextQuestionRoute)

    return h.view(VIEW_PATH, {
      pageTitle: outcome.heading ?? 'Outcome',
      outcome,
      outcomeTypes,
      section,
      backLink: getBackLink(request, outcomeRoute),
      canContinue
    })
  }
}

export const outcomeSubmitController = {
  options: {
    auth: false
  },
  async handler(request, h) {
    if (!getJourneyState(request)) {
      return h.redirect(START_PATH)
    }

    const outcomeRoute = '/' + request.params.outcomePath
    const outcome = getOutcome(outcomeRoute)
    const outcomeType = getOutcomeType(request.payload.selectedOutcomeTypeId)

    // Routing outcomeType — re-enters the question tree
    if (outcomeType.nextQuestionRoute) {
      const answer = {
        questionRoute: outcomeRoute,
        questionText: outcomeType.text ?? outcome.heading,
        mcmsAppFormMapping: null,
        answerId: outcomeType.id,
        answerText: outcomeType.heading,
        answeredAt: new Date().toISOString()
      }
      await pushAnswers(request, h, [answer])
      return h.redirect(`${ROUTE_PREFIX}${outcomeType.nextQuestionRoute}`)
    }

    // Terminal outcomeType — trim any stale future answers
    await deleteFutureAnswersFromOutcome(request, h, outcomeRoute)

    // Handle external redirect (overrideCtaButtonUrl)
    if (outcomeType.overrideCtaButtonUrl) {
      const redirectUrl = buildExternalRedirectUrl(request, outcomeType)
      return h.redirect(redirectUrl)
    }

    // Handle module launch (MMO_APP2_CONTROL, MMO_ADVICE_CONTROL etc.)
    // TBD: For now, show the outcome page with a message
    if (outcomeType.module) {
      return h.view(VIEW_PATH, {
        pageTitle: outcome.heading ?? 'Outcome',
        outcome,
        outcomeTypes: [outcomeType],
        section: outcome.section ? getSection(outcome.section) : null,
        canContinue: false,
        terminalMessage: `This outcome would launch the ${outcomeType.module} module. Integration is pending.`
      })
    }

    // Info-only or download — just re-render the outcome page
    return h.view(VIEW_PATH, {
      pageTitle: outcome.heading ?? 'Outcome',
      outcome,
      outcomeTypes: [outcomeType],
      section: outcome.section ? getSection(outcome.section) : null,
      canContinue: false
    })
  }
}

/**
 * Build an external redirect URL with outcomeType params and mcmsAppFormMapping answers.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {object} outcomeType
 * @returns {string}
 */
function buildExternalRedirectUrl(request, outcomeType) {
  const url = new URL(outcomeType.overrideCtaButtonUrl)

  url.searchParams.set('outcomeType', outcomeType.id)

  if (outcomeType.params) {
    for (const param of outcomeType.params) {
      url.searchParams.set(param.name, param.value)
    }
  }

  // Add mcmsAppFormMapping answer values
  const state = getJourneyState(request)
  if (state) {
    for (const answer of state.answers) {
      if (answer.mcmsAppFormMapping) {
        url.searchParams.set(answer.mcmsAppFormMapping, answer.answerId)
      }
    }
  }

  return url.toString()
}
