import { calculateNextRoute } from '#src/server/self-service/services/journey-router.js'

describe('journey-router', () => {
  describe('single-select questions', () => {
    const question = {
      route: '/sea',
      text: 'Where will activities take place?',
      answers: [
        {
          id: 'inTheSea',
          text: 'In or over the sea',
          nextQuestionRoute: '/jurisdiction'
        },
        {
          id: 'onLand',
          text: 'On land',
          outcomeRoute: '/not-licensable'
        }
      ]
    }

    test('routes to next question when answer has nextQuestionRoute', () => {
      const result = calculateNextRoute(question, ['inTheSea'])
      expect(result).toEqual({ type: 'question', route: '/jurisdiction' })
    })

    test('routes to outcome when answer has outcomeRoute', () => {
      const result = calculateNextRoute(question, ['onLand'])
      expect(result).toEqual({ type: 'outcome', route: '/not-licensable' })
    })

    test('throws when multiple answers provided for single-select', () => {
      expect(() =>
        calculateNextRoute(question, ['inTheSea', 'onLand'])
      ).toThrow('received 2 answers')
    })

    test('throws when no answers provided', () => {
      expect(() => calculateNextRoute(question, [])).toThrow(
        'received 0 answers'
      )
    })

    test('throws when answer id not found', () => {
      expect(() => calculateNextRoute(question, ['unknown'])).toThrow(
        "No answer found for id 'unknown'"
      )
    })

    test('throws when answer has no route', () => {
      const badQuestion = {
        route: '/bad',
        text: 'Bad question',
        answers: [{ id: 'noRoute', text: 'No route' }]
      }
      expect(() => calculateNextRoute(badQuestion, ['noRoute'])).toThrow(
        'has no nextQuestionRoute or outcomeRoute'
      )
    })
  })

  describe('multiSelect questions', () => {
    const multiSelectQuestion = {
      route: '/construction/maintenance',
      text: 'Select sub-activities',
      multiSelect: {
        questionRoute: '/construction/scaffolding',
        outcomeRoute: '/standard-mla',
        outcomeAnswerId: 'OTHER_MAINTENANCE'
      },
      answers: [
        { id: 'SCAFFOLDING', text: 'Scaffolding' },
        { id: 'REPAINTING', text: 'Repainting' },
        { id: 'OTHER_MAINTENANCE', text: 'Other maintenance' }
      ]
    }

    test('routes to questionRoute when non-outcome answers selected', () => {
      const result = calculateNextRoute(multiSelectQuestion, [
        'SCAFFOLDING',
        'REPAINTING'
      ])
      expect(result).toEqual({
        type: 'question',
        route: '/construction/scaffolding'
      })
    })

    test('routes to outcomeRoute when outcome answer selected', () => {
      const result = calculateNextRoute(multiSelectQuestion, [
        'OTHER_MAINTENANCE'
      ])
      expect(result).toEqual({ type: 'outcome', route: '/standard-mla' })
    })

    test('routes to outcomeRoute when outcome answer is among selections', () => {
      const result = calculateNextRoute(multiSelectQuestion, [
        'SCAFFOLDING',
        'OTHER_MAINTENANCE'
      ])
      expect(result).toEqual({ type: 'outcome', route: '/standard-mla' })
    })
  })
})
