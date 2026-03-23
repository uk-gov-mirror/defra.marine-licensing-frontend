export const ROUTE_PREFIX = '/journey/self-service'
export const START_PATH = `${ROUTE_PREFIX}/start`
export const ANSWERS_PATH = `${ROUTE_PREFIX}/answers`
export const QUESTION_PATH = `${ROUTE_PREFIX}/{questionPath*}`
export const OUTCOME_PATH = `${ROUTE_PREFIX}/outcome/{outcomePath*}`

export const STATUS_CODE_BAD_REQUEST = 400
