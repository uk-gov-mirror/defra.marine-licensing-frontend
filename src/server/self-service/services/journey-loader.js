import { createRequire } from 'node:module'
import sanitizeHtml from 'sanitize-html'

const require = createRequire(import.meta.url)
const journeyData = require('../data/self-service.json')

const sanitizeOptions = {
  allowedTags: ['a', 'b', 'br', 'li', 'ol', 'p', 'strong', 'u', 'ul'],
  allowedAttributes: {
    a: ['href', 'target'],
    ol: ['type']
  },
  allowedSchemes: ['http', 'https']
}

function sanitizeText(text) {
  return text ? sanitizeHtml(text, sanitizeOptions) : text
}

const questionsByRoute = new Map()
const outcomesByRoute = new Map()
const outcomeTypesById = new Map()
const sectionsById = new Map()

for (const question of journeyData.questions) {
  question.hint = sanitizeText(question.hint)
  for (const answer of question.answers) {
    answer.hint = sanitizeText(answer.hint)
  }
  questionsByRoute.set(question.route, question)
}

for (const outcome of journeyData.outcomes) {
  outcome.text = sanitizeText(outcome.text)
  outcomesByRoute.set(outcome.route, outcome)
}

for (const outcomeType of journeyData.outcomeTypes) {
  outcomeType.text = sanitizeText(outcomeType.text)
  outcomeTypesById.set(outcomeType.id, outcomeType)
}

for (const section of journeyData.sections) {
  sectionsById.set(section.id, section)
}

export const firstQuestionRoute = journeyData.firstQuestionRoute
export const documentPreambleText = journeyData.documentPreambleText

/**
 * @param {string} route
 * @returns {object}
 */
export function getQuestion(route) {
  const question = questionsByRoute.get(route)
  if (!question) {
    throw new Error(`No question found for route '${route}'`)
  }
  return question
}

/**
 * @param {string} route
 * @returns {object}
 */
export function getOutcome(route) {
  const outcome = outcomesByRoute.get(route)
  if (!outcome) {
    throw new Error(`No outcome found for route '${route}'`)
  }
  return outcome
}

/**
 * @param {string} id
 * @returns {object}
 */
export function getOutcomeType(id) {
  const outcomeType = outcomeTypesById.get(id)
  if (!outcomeType) {
    throw new Error(`No outcomeType found for id '${id}'`)
  }
  return outcomeType
}

/**
 * @param {object} outcome
 * @returns {object[]}
 */
export function getOutcomeTypesForOutcome(outcome) {
  return outcome.outcomeTypes.map((id) => getOutcomeType(id))
}

/**
 * @param {string} id
 * @returns {object | null}
 */
export function getSection(id) {
  return sectionsById.get(id) ?? null
}

export function hasQuestion(route) {
  return questionsByRoute.has(route)
}

export function hasOutcome(route) {
  return outcomesByRoute.has(route)
}
