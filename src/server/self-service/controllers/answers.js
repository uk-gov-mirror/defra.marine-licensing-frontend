import { START_PATH } from '#src/server/self-service/constants.js'
import { getJourneyState } from '#src/server/self-service/services/session-answers.js'
import {
  documentPreambleText,
  getQuestion,
  getOutcome,
  getOutcomeType,
  hasQuestion
} from '#src/server/self-service/services/journey-loader.js'

const VIEW_PATH = 'self-service/views/answers'

export const answersController = {
  options: {
    auth: false // Self-service journey is entirely public, no authentication required
  },
  handler(request, h) {
    const state = getJourneyState(request)

    if (!state) {
      return h.redirect(START_PATH)
    }

    const groupedAnswers = groupAnswersByQuestion(state.answers)

    const dateOfCheck = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return h.view(VIEW_PATH, {
      pageTitle: 'Record of answers',
      preambleText: documentPreambleText,
      dateOfCheck,
      groupedAnswers
    })
  }
}

/**
 * Group flat answer array by question route, preserving order.
 * Resolves display text from the trusted journey JSON rather than session.
 *
 * @param {object[]} answers
 * @returns {{ questionText: string, answers: string[] }[]}
 */
function groupAnswersByQuestion(answers) {
  const grouped = new Map()

  for (const answer of answers) {
    if (!grouped.has(answer.questionRoute)) {
      grouped.set(answer.questionRoute, {
        questionText: resolveQuestionText(answer.questionRoute),
        answers: []
      })
    }
    grouped
      .get(answer.questionRoute)
      .answers.push(resolveAnswerText(answer.questionRoute, answer.answerId))
  }

  return [...grouped.values()]
}

/**
 * @param {string} route
 * @returns {string}
 */
function resolveQuestionText(route) {
  if (hasQuestion(route)) {
    return getQuestion(route).text
  }
  const outcome = getOutcome(route)
  return outcome.heading
}

/**
 * @param {string} questionRoute
 * @param {string} answerId
 * @returns {string}
 */
function resolveAnswerText(questionRoute, answerId) {
  if (hasQuestion(questionRoute)) {
    const question = getQuestion(questionRoute)
    const answer = question.answers.find((a) => a.id === answerId)
    return answer?.text ?? answerId
  }
  const outcomeType = getOutcomeType(answerId)
  return outcomeType.heading
}
