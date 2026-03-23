/**
 * Calculate the next route given a question and the selected answer IDs.
 * Returns { type: 'question' | 'outcome', route: string }
 *
 * @param {object} question
 * @param {string[]} selectedAnswerIds
 * @returns {{ type: string, route: string }}
 */
export function calculateNextRoute(question, selectedAnswerIds) {
  if (question.multiSelect) {
    return getMultiSelectRoute(question.multiSelect, selectedAnswerIds)
  }

  if (selectedAnswerIds.length !== 1) {
    throw new Error(
      `Single-select question '${question.route}' received ${selectedAnswerIds.length} answers`
    )
  }

  const answer = question.answers.find((a) => a.id === selectedAnswerIds[0])

  if (!answer) {
    throw new Error(
      `No answer found for id '${selectedAnswerIds[0]}' on question '${question.route}'`
    )
  }

  if (answer.nextQuestionRoute) {
    return { type: 'question', route: answer.nextQuestionRoute }
  }

  if (answer.outcomeRoute) {
    return { type: 'outcome', route: answer.outcomeRoute }
  }

  throw new Error(
    `Answer '${answer.id}' on question '${question.route}' has no nextQuestionRoute or outcomeRoute`
  )
}

/**
 * @param {object} multiSelect
 * @param {string[]} selectedAnswerIds
 * @returns {{ type: string, route: string }}
 */
function getMultiSelectRoute(multiSelect, selectedAnswerIds) {
  if (selectedAnswerIds.includes(multiSelect.outcomeAnswerId)) {
    return { type: 'outcome', route: multiSelect.outcomeRoute }
  }
  return { type: 'question', route: multiSelect.questionRoute }
}
