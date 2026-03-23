import {
  ROUTE_PREFIX,
  START_PATH,
  STATUS_CODE_BAD_REQUEST
} from '#src/server/self-service/constants.js'
import {
  getQuestion,
  getSection
} from '#src/server/self-service/services/journey-loader.js'
import { calculateNextRoute } from '#src/server/self-service/services/journey-router.js'
import {
  getJourneyState,
  getAnswersForRoute,
  getBackLink,
  pushAnswers
} from '#src/server/self-service/services/session-answers.js'

const VIEW_PATH = 'self-service/views/question'

export const questionController = {
  options: {
    auth: false
  },
  handler(request, h) {
    if (!getJourneyState(request)) {
      return h.redirect(START_PATH)
    }

    const questionRoute = '/' + request.params.questionPath
    const question = getQuestion(questionRoute)
    const previousAnswers = getAnswersForRoute(request, questionRoute)
    const section = question.section ? getSection(question.section) : null

    return h.view(VIEW_PATH, {
      pageTitle: question.text,
      question,
      section,
      backLink: getBackLink(request, questionRoute),
      selectedAnswerIds: previousAnswers.map((a) => a.answerId)
    })
  }
}

export const questionSubmitController = {
  options: {
    auth: false
  },
  async handler(request, h) {
    if (!getJourneyState(request)) {
      return h.redirect(START_PATH)
    }

    const questionRoute = '/' + request.params.questionPath
    const question = getQuestion(questionRoute)
    const section = question.section ? getSection(question.section) : null

    const selectedIds = [request.payload?.answers ?? []].flat()

    if (selectedIds.length === 0) {
      return h
        .view(VIEW_PATH, {
          pageTitle: question.text,
          question,
          section,
          selectedAnswerIds: [],
          errors: { answers: { text: 'Select an answer' } },
          errorSummary: [{ text: 'Select an answer', href: '#answers' }]
        })
        .code(STATUS_CODE_BAD_REQUEST)
    }

    const now = new Date().toISOString()
    const newAnswers = selectedIds.map((id) => {
      const answer = question.answers.find((a) => a.id === id)
      if (!answer) {
        throw new Error(
          `Invalid answer id '${id}' for question '${questionRoute}'`
        )
      }
      return {
        questionRoute: question.route,
        mcmsAppFormMapping: question.mcmsAppFormMapping ?? null,
        answerId: answer.id,
        answeredAt: now
      }
    })

    await pushAnswers(request, h, newAnswers)

    const next = calculateNextRoute(question, selectedIds)

    if (next.type === 'question') {
      return h.redirect(`${ROUTE_PREFIX}${next.route}`)
    }

    return h.redirect(`${ROUTE_PREFIX}/outcome${next.route}`)
  }
}
