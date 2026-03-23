import { vi } from 'vitest'

import {
  getJourneyState,
  initialiseJourney,
  pushAnswers,
  getAnswersForRoute,
  getBackLink,
  clearJourney
} from '#src/server/self-service/services/session-answers.js'

function createMockRequest(sessionData = null) {
  const store = { selfServiceJourney: sessionData }
  return {
    yar: {
      get: vi.fn((key) => {
        const val = store[key]
        return val ? JSON.parse(JSON.stringify(val)) : null
      }),
      set: vi.fn((key, value) => {
        store[key] = value
      }),
      clear: vi.fn((key) => {
        store[key] = null
      }),
      commit: vi.fn()
    }
  }
}

const mockH = {}

describe('session-answers', () => {
  describe('getJourneyState', () => {
    test('returns null when no session', () => {
      const request = createMockRequest()
      expect(getJourneyState(request)).toBeNull()
    })

    test('returns state when session exists', () => {
      const state = { startedAt: '2026-01-01', answers: [] }
      const request = createMockRequest(state)
      expect(getJourneyState(request)).toEqual(state)
    })
  })

  describe('initialiseJourney', () => {
    test('creates a new journey state', async () => {
      const request = createMockRequest()
      await initialiseJourney(request, mockH)
      expect(request.yar.set).toHaveBeenCalledWith(
        'selfServiceJourney',
        expect.objectContaining({
          startedAt: expect.any(String),
          answers: []
        })
      )
      expect(request.yar.commit).toHaveBeenCalledWith(mockH)
    })
  })

  describe('pushAnswers and deleteFutureAnswers', () => {
    test('pushes new answers', async () => {
      const state = { startedAt: '2026-01-01', answers: [] }
      const request = createMockRequest(state)

      const newAnswers = [
        {
          questionRoute: '/sea',

          answerId: 'inSea',

          answeredAt: '2026-01-01T00:01:00Z'
        }
      ]

      await pushAnswers(request, mockH, newAnswers)

      const savedState = request.yar.set.mock.calls[0][1]
      expect(savedState.answers).toHaveLength(1)
      expect(savedState.answers[0].answerId).toBe('inSea')
    })

    test('deletes future answers when re-answering a question', async () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          {
            questionRoute: '/sea',

            answerId: 'inSea',

            answeredAt: '2026-01-01T00:01:00Z'
          },
          {
            questionRoute: '/jurisdiction',

            answerId: 'english',

            answeredAt: '2026-01-01T00:02:00Z'
          },
          {
            questionRoute: '/activity-type',

            answerId: 'construction',

            answeredAt: '2026-01-01T00:03:00Z'
          }
        ]
      }
      const request = createMockRequest(state)

      const newAnswers = [
        {
          questionRoute: '/sea',

          answerId: 'onLand',

          answeredAt: '2026-01-01T00:04:00Z'
        }
      ]

      await pushAnswers(request, mockH, newAnswers)

      const savedState = request.yar.set.mock.calls[0][1]
      expect(savedState.answers).toHaveLength(1)
      expect(savedState.answers[0].answerId).toBe('onLand')
    })

    test('deletes only from re-answered question onwards', async () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          {
            questionRoute: '/sea',
            answerId: 'inSea',
            answeredAt: '2026-01-01T00:01:00Z'
          },
          {
            questionRoute: '/jurisdiction',
            answerId: 'english',
            answeredAt: '2026-01-01T00:02:00Z'
          },
          {
            questionRoute: '/activity-type',
            answerId: 'construction',
            answeredAt: '2026-01-01T00:03:00Z'
          }
        ]
      }
      const request = createMockRequest(state)

      const newAnswers = [
        {
          questionRoute: '/jurisdiction',
          answerId: 'otherUk',
          answeredAt: '2026-01-01T00:04:00Z'
        }
      ]

      await pushAnswers(request, mockH, newAnswers)

      const savedState = request.yar.set.mock.calls[0][1]
      expect(savedState.answers).toHaveLength(2)
      expect(savedState.answers[0].answerId).toBe('inSea')
      expect(savedState.answers[1].answerId).toBe('otherUk')
    })

    test('appends when question not previously answered', async () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          {
            questionRoute: '/sea',
            answerId: 'inSea',
            answeredAt: '2026-01-01T00:01:00Z'
          }
        ]
      }
      const request = createMockRequest(state)

      const newAnswers = [
        {
          questionRoute: '/jurisdiction',
          answerId: 'english',
          answeredAt: '2026-01-01T00:02:00Z'
        }
      ]

      await pushAnswers(request, mockH, newAnswers)

      const savedState = request.yar.set.mock.calls[0][1]
      expect(savedState.answers).toHaveLength(2)
    })
  })

  describe('getAnswersForRoute', () => {
    test('returns answers for a specific route', () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          { questionRoute: '/sea', answerId: 'inSea' },
          { questionRoute: '/jurisdiction', answerId: 'english' }
        ]
      }
      const request = createMockRequest(state)
      const answers = getAnswersForRoute(request, '/sea')
      expect(answers).toHaveLength(1)
      expect(answers[0].answerId).toBe('inSea')
    })

    test('returns empty array when no session', () => {
      const request = createMockRequest()
      expect(getAnswersForRoute(request, '/sea')).toEqual([])
    })

    test('returns empty array when no answers for route', () => {
      const state = { startedAt: '2026-01-01', answers: [] }
      const request = createMockRequest(state)
      expect(getAnswersForRoute(request, '/sea')).toEqual([])
    })
  })

  describe('getBackLink', () => {
    test('returns start path when no session', () => {
      const request = createMockRequest()
      expect(getBackLink(request, '/sea')).toBe('/journey/self-service/start')
    })

    test('returns start path when no answers', () => {
      const state = { startedAt: '2026-01-01', answers: [] }
      const request = createMockRequest(state)
      expect(getBackLink(request, '/sea')).toBe('/journey/self-service/start')
    })

    test('returns start path when on first answered question', () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          { questionRoute: '/sea', answerId: 'inSea' },
          { questionRoute: '/jurisdiction', answerId: 'english' }
        ]
      }
      const request = createMockRequest(state)
      expect(getBackLink(request, '/sea')).toBe('/journey/self-service/start')
    })

    test('returns previous answered question when on a later question', () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          { questionRoute: '/sea', answerId: 'inSea' },
          { questionRoute: '/jurisdiction', answerId: 'english' },
          { questionRoute: '/activity-type', answerId: 'construction' }
        ]
      }
      const request = createMockRequest(state)
      expect(getBackLink(request, '/activity-type')).toBe(
        '/journey/self-service/jurisdiction'
      )
    })

    test('returns last answer when current route not yet answered', () => {
      const state = {
        startedAt: '2026-01-01',
        answers: [
          { questionRoute: '/sea', answerId: 'inSea' },
          { questionRoute: '/jurisdiction', answerId: 'english' }
        ]
      }
      const request = createMockRequest(state)
      expect(getBackLink(request, '/activity-type')).toBe(
        '/journey/self-service/jurisdiction'
      )
    })
  })

  describe('clearJourney', () => {
    test('clears the session', async () => {
      const state = { startedAt: '2026-01-01', answers: [] }
      const request = createMockRequest(state)
      await clearJourney(request, mockH)
      expect(request.yar.clear).toHaveBeenCalledWith('selfServiceJourney')
      expect(request.yar.commit).toHaveBeenCalledWith(mockH)
    })
  })
})
