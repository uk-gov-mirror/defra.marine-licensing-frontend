import { START_PATH } from '#src/server/self-service/constants.js'
import { getJourneyState } from '#src/server/self-service/services/session-answers.js'
import { documentPreambleText } from '#src/server/self-service/services/journey-loader.js'

const VIEW_PATH = 'self-service/views/answers'

export const answersController = {
  options: {
    auth: false
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
 *
 * @param {object[]} answers
 * @returns {{ questionText: string, answers: string[] }[]}
 */
function groupAnswersByQuestion(answers) {
  const grouped = new Map()

  for (const answer of answers) {
    if (!grouped.has(answer.questionRoute)) {
      grouped.set(answer.questionRoute, {
        questionText: answer.questionText,
        answers: []
      })
    }
    grouped.get(answer.questionRoute).answers.push(answer.answerText)
  }

  return [...grouped.values()]
}
