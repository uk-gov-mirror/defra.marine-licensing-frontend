import {
  firstQuestionRoute,
  documentPreambleText,
  getQuestion,
  getOutcome,
  getOutcomeType,
  getOutcomeTypesForOutcome,
  getSection,
  hasQuestion,
  hasOutcome
} from '#src/server/self-service/services/journey-loader.js'

describe('journey-loader', () => {
  test('firstQuestionRoute is /sea', () => {
    expect(firstQuestionRoute).toBe('/sea')
  })

  test('documentPreambleText is defined', () => {
    expect(documentPreambleText).toBeTruthy()
    expect(typeof documentPreambleText).toBe('string')
  })

  describe('getQuestion', () => {
    test('returns the /sea question', () => {
      const question = getQuestion('/sea')
      expect(question.route).toBe('/sea')
      expect(question.text).toBeTruthy()
      expect(question.answers.length).toBeGreaterThan(0)
    })

    test('returns the /jurisdiction question', () => {
      const question = getQuestion('/jurisdiction')
      expect(question.route).toBe('/jurisdiction')
      expect(question.answers.length).toBeGreaterThan(0)
    })

    test('throws for unknown route', () => {
      expect(() => getQuestion('/nonexistent')).toThrow(
        "No question found for route '/nonexistent'"
      )
    })
  })

  describe('getOutcome', () => {
    test('returns an outcome by route', () => {
      const outcome = getOutcome('/licence-not-required-devolved')
      expect(outcome.route).toBe('/licence-not-required-devolved')
      expect(outcome.outcomeTypes).toBeDefined()
    })

    test('throws for unknown route', () => {
      expect(() => getOutcome('/nonexistent')).toThrow(
        "No outcome found for route '/nonexistent'"
      )
    })
  })

  describe('getOutcomeType', () => {
    test('returns an outcomeType by id', () => {
      const ot = getOutcomeType('WO_STANDARD_TRACK_MLA')
      expect(ot.id).toBe('WO_STANDARD_TRACK_MLA')
    })

    test('throws for unknown id', () => {
      expect(() => getOutcomeType('NONEXISTENT')).toThrow(
        "No outcomeType found for id 'NONEXISTENT'"
      )
    })
  })

  describe('getOutcomeTypesForOutcome', () => {
    test('returns outcomeTypes for an outcome', () => {
      const outcome = getOutcome('/licence-not-required-devolved')
      const types = getOutcomeTypesForOutcome(outcome)
      expect(types.length).toBe(outcome.outcomeTypes.length)
      for (const ot of types) {
        expect(ot.id).toBeTruthy()
      }
    })
  })

  describe('getSection', () => {
    test('returns a section by id', () => {
      const section = getSection('doINeedAMarineLicence')
      expect(section).not.toBeNull()
      expect(section.id).toBe('doINeedAMarineLicence')
      expect(section.text).toBeTruthy()
    })

    test('returns null for unknown id', () => {
      expect(getSection('nonexistent')).toBeNull()
    })
  })

  describe('hasQuestion / hasOutcome', () => {
    test('hasQuestion returns true for known route', () => {
      expect(hasQuestion('/sea')).toBe(true)
    })

    test('hasQuestion returns false for unknown route', () => {
      expect(hasQuestion('/nonexistent')).toBe(false)
    })

    test('hasOutcome returns true for known route', () => {
      expect(hasOutcome('/licence-not-required-devolved')).toBe(true)
    })

    test('hasOutcome returns false for unknown route', () => {
      expect(hasOutcome('/nonexistent')).toBe(false)
    })
  })
})
