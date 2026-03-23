import {
  START_PATH,
  ANSWERS_PATH,
  QUESTION_PATH,
  OUTCOME_PATH
} from '#src/server/self-service/constants.js'
import {
  startController,
  startSubmitController
} from '#src/server/self-service/controllers/start.js'
import {
  questionController,
  questionSubmitController
} from '#src/server/self-service/controllers/question.js'
import {
  outcomeController,
  outcomeSubmitController
} from '#src/server/self-service/controllers/outcome.js'
import { answersController } from '#src/server/self-service/controllers/answers.js'

export const selfServiceRoutes = [
  {
    method: 'GET',
    path: START_PATH,
    ...startController
  },
  {
    method: 'POST',
    path: START_PATH,
    ...startSubmitController
  },
  {
    method: 'GET',
    path: ANSWERS_PATH,
    ...answersController
  },
  {
    method: 'GET',
    path: OUTCOME_PATH,
    ...outcomeController
  },
  {
    method: 'POST',
    path: OUTCOME_PATH,
    ...outcomeSubmitController
  },
  {
    method: 'GET',
    path: QUESTION_PATH,
    ...questionController
  },
  {
    method: 'POST',
    path: QUESTION_PATH,
    ...questionSubmitController
  }
]
