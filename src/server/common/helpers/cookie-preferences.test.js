import {
  getCookiePreferences,
  areAnalyticsCookiesAccepted,
  hasUserMadeCookieChoice
} from './cookie-preferences.js'

describe('cookie-preferences', () => {
  describe('getCookiePreferences', () => {
    describe('when cookies_policy exists', () => {
      it('should return the existing cookie policy object', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: true,
              timestamp: 1234567890
            }
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: true,
          timestamp: 1234567890
        })
      })

      it('should return analytics false when explicitly set to false', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: false,
              timestamp: 1234567890
            }
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: 1234567890
        })
      })

      it('should return cookie policy with null timestamp', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: true,
              timestamp: null
            }
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: true,
          timestamp: null
        })
      })

      it('should return cookie policy with all properties intact', () => {
        const expectedPolicy = {
          essential: true,
          analytics: false,
          timestamp: 9876543210,
          extraProperty: 'should be preserved'
        }

        const mockRequest = {
          state: {
            cookies_policy: expectedPolicy
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual(expectedPolicy)
      })
    })

    describe('when cookies_policy does not exist', () => {
      it('should return default preferences when state is undefined', () => {
        const mockRequest = {
          state: undefined
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should return default preferences when state is null', () => {
        const mockRequest = {
          state: null
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should return default preferences when state is empty object', () => {
        const mockRequest = {
          state: {}
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should return default preferences when cookies_policy is undefined', () => {
        const mockRequest = {
          state: {
            cookies_policy: undefined
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should return default preferences when cookies_policy is null', () => {
        const mockRequest = {
          state: {
            cookies_policy: null
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })
    })

    describe('edge cases', () => {
      it('should handle request with no state property', () => {
        const mockRequest = {}

        const result = getCookiePreferences(mockRequest)

        expect(result).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should handle falsy cookies_policy values', () => {
        const falsyValues = [false, 0, '', NaN]

        falsyValues.forEach((value) => {
          const mockRequest = {
            state: {
              cookies_policy: value
            }
          }

          const result = getCookiePreferences(mockRequest)

          expect(result).toEqual({
            essential: true,
            analytics: false,
            timestamp: null
          })
        })
      })

      it('should preserve unexpected data types in cookies_policy', () => {
        const mockRequest = {
          state: {
            cookies_policy: 'unexpected string'
          }
        }

        const result = getCookiePreferences(mockRequest)

        expect(result).toBe('unexpected string')
      })
    })
  })

  describe('areAnalyticsCookiesAccepted', () => {
    describe('when analytics cookies are accepted', () => {
      it('should return true when analytics is explicitly true', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: true,
              timestamp: 1234567890
            }
          }
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(true)
      })
    })

    describe('when analytics cookies are not accepted', () => {
      it('should return false when analytics is explicitly false', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: false,
              timestamp: 1234567890
            }
          }
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when using default preferences', () => {
        const mockRequest = {
          state: {}
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when state is undefined', () => {
        const mockRequest = {
          state: undefined
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when cookies_policy is null', () => {
        const mockRequest = {
          state: {
            cookies_policy: null
          }
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should return false for truthy but non-true values', () => {
        const truthyButNotTrue = [1, 'true', 'yes', [], {}]

        truthyButNotTrue.forEach((value) => {
          const mockRequest = {
            state: {
              cookies_policy: {
                essential: true,
                analytics: value,
                timestamp: 1234567890
              }
            }
          }

          const result = areAnalyticsCookiesAccepted(mockRequest)

          expect(result).toBe(false)
        })
      })

      it('should return false when analytics property is missing', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              timestamp: 1234567890
            }
          }
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when analytics is undefined', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: undefined,
              timestamp: 1234567890
            }
          }
        }

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })

      it('should handle request with no state property', () => {
        const mockRequest = {}

        const result = areAnalyticsCookiesAccepted(mockRequest)

        expect(result).toBe(false)
      })
    })
  })

  describe('hasUserMadeCookieChoice', () => {
    describe('when user has made a choice', () => {
      it('should return true when cookies_preferences_set is "true"', () => {
        const mockRequest = {
          state: {
            cookies_preferences_set: 'true'
          }
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(true)
      })
    })

    describe('when user has not made a choice', () => {
      it('should return false when cookies_preferences_set is "false"', () => {
        const mockRequest = {
          state: {
            cookies_preferences_set: 'false'
          }
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when cookies_preferences_set is undefined', () => {
        const mockRequest = {
          state: {
            cookies_preferences_set: undefined
          }
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when state is empty object', () => {
        const mockRequest = {
          state: {}
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when state is null', () => {
        const mockRequest = {
          state: null
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when state is undefined', () => {
        const mockRequest = {
          state: undefined
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false when cookies_preferences_set is null', () => {
        const mockRequest = {
          state: {
            cookies_preferences_set: null
          }
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should return false for boolean true instead of string "true"', () => {
        const mockRequest = {
          state: {
            cookies_preferences_set: true
          }
        }

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })

      it('should return false for various truthy values that are not "true"', () => {
        const truthyValues = [1, 'yes', 'TRUE', 'True', [], {}]

        truthyValues.forEach((value) => {
          const mockRequest = {
            state: {
              cookies_preferences_set: value
            }
          }

          const result = hasUserMadeCookieChoice(mockRequest)

          expect(result).toBe(false)
        })
      })

      it('should return false for falsy values', () => {
        const falsyValues = [false, 0, '', NaN]

        falsyValues.forEach((value) => {
          const mockRequest = {
            state: {
              cookies_preferences_set: value
            }
          }

          const result = hasUserMadeCookieChoice(mockRequest)

          expect(result).toBe(false)
        })
      })

      it('should handle request with no state property', () => {
        const mockRequest = {}

        const result = hasUserMadeCookieChoice(mockRequest)

        expect(result).toBe(false)
      })
    })
  })

  describe('integration scenarios', () => {
    describe('complete user workflow', () => {
      it('should handle fresh user with no cookies', () => {
        const mockRequest = { state: {} }

        expect(hasUserMadeCookieChoice(mockRequest)).toBe(false)
        expect(areAnalyticsCookiesAccepted(mockRequest)).toBe(false)
        expect(getCookiePreferences(mockRequest)).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should handle user who accepted analytics cookies', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: true,
              timestamp: 1234567890
            },
            cookies_preferences_set: 'true'
          }
        }

        expect(hasUserMadeCookieChoice(mockRequest)).toBe(true)
        expect(areAnalyticsCookiesAccepted(mockRequest)).toBe(true)
        expect(getCookiePreferences(mockRequest)).toEqual({
          essential: true,
          analytics: true,
          timestamp: 1234567890
        })
      })

      it('should handle user who rejected analytics cookies', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: false,
              timestamp: 1234567890
            },
            cookies_preferences_set: 'true'
          }
        }

        expect(hasUserMadeCookieChoice(mockRequest)).toBe(true)
        expect(areAnalyticsCookiesAccepted(mockRequest)).toBe(false)
        expect(getCookiePreferences(mockRequest)).toEqual({
          essential: true,
          analytics: false,
          timestamp: 1234567890
        })
      })
    })

    describe('data consistency scenarios', () => {
      it('should handle inconsistent state where preferences_set exists but policy does not', () => {
        const mockRequest = {
          state: {
            cookies_preferences_set: 'true'
          }
        }

        expect(hasUserMadeCookieChoice(mockRequest)).toBe(true)
        expect(areAnalyticsCookiesAccepted(mockRequest)).toBe(false)
        expect(getCookiePreferences(mockRequest)).toEqual({
          essential: true,
          analytics: false,
          timestamp: null
        })
      })

      it('should handle inconsistent state where policy exists but preferences_set does not', () => {
        const mockRequest = {
          state: {
            cookies_policy: {
              essential: true,
              analytics: true,
              timestamp: 1234567890
            }
          }
        }

        expect(hasUserMadeCookieChoice(mockRequest)).toBe(false)
        expect(areAnalyticsCookiesAccepted(mockRequest)).toBe(true)
        expect(getCookiePreferences(mockRequest)).toEqual({
          essential: true,
          analytics: true,
          timestamp: 1234567890
        })
      })
    })
  })
})
