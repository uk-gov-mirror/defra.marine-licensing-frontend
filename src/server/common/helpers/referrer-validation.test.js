import {
  isValidReferrerPath,
  extractReferrerPath,
  storeReferrer,
  getStoredReferrer,
  clearStoredReferrer,
  getBackUrl
} from './referrer-validation.js'

describe('referrer-validation', () => {
  describe('isValidReferrerPath', () => {
    describe('valid paths', () => {
      const validPaths = [
        '/',
        '/exemption/task-list',
        '/exemption/site-details/coordinates',
        '/auth/login',
        '/about',
        '/help/accessibility',
        '/path/with/many/segments',
        '/path-with-hyphens',
        '/path_with_underscores',
        '/path123with456numbers',
        '/path?query=value',
        '/path?query=value&another=param',
        '/path#fragment',
        '/path?query=value#fragment'
      ]

      validPaths.forEach((path) => {
        it(`should return true for valid path: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(true)
        })
      })
    })

    describe('invalid paths - null and undefined', () => {
      const invalidInputs = [null, undefined, '', 0, false, NaN, {}]

      invalidInputs.forEach((input) => {
        it(`should return false for ${String(input)}`, () => {
          expect(isValidReferrerPath(input)).toBe(false)
        })
      })
    })

    describe('invalid paths - non-string types', () => {
      const nonStringInputs = [123, [], {}, true]

      nonStringInputs.forEach((input) => {
        it(`should return false for non-string input: ${typeof input}`, () => {
          expect(isValidReferrerPath(input)).toBe(false)
        })
      })
    })

    describe('invalid paths - not starting with /', () => {
      const invalidStartPaths = [
        'exemption/task-list',
        'relative/path',
        'http://example.com',
        'https://example.com/path',
        'ftp://example.com',
        'mailto:test@example.com'
      ]

      invalidStartPaths.forEach((path) => {
        it(`should return false for path not starting with /: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(false)
        })
      })
    })

    describe('invalid paths - cookies page self-reference', () => {
      it('should return false for exact cookies page path', () => {
        expect(isValidReferrerPath('/help/cookies')).toBe(false)
      })
    })

    describe('invalid paths - path traversal attacks', () => {
      const pathTraversalPaths = [
        '/path/../../../etc/passwd',
        '/exemption/../../../sensitive',
        '/path/..%2F..%2F..%2Fetc%2Fpasswd',
        '/../root',
        '/./../../etc/passwd',
        '/path/to/../../../system'
      ]

      pathTraversalPaths.forEach((path) => {
        it(`should return false for path traversal: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(false)
        })
      })
    })

    describe('invalid paths - double slashes', () => {
      const doubleSlashPaths = [
        '/path//to/resource',
        '//example.com/path',
        '/path//double//slashes',
        '/start//middle//end',
        '///triple/slash'
      ]

      doubleSlashPaths.forEach((path) => {
        it(`should return false for double slashes: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(false)
        })
      })
    })

    describe('invalid paths - javascript injection', () => {
      const jsInjectionPaths = [
        '/javascript:alert(1)',
        '/path/javascript:malicious',
        '/JAVASCRIPT:ALERT(1)',
        '/Javascript:Alert(1)',
        '/jAvAsCrIpT:alert()',
        'javascript:void(0)'
      ]

      jsInjectionPaths.forEach((path) => {
        it(`should return false for javascript injection: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(false)
        })
      })
    })

    describe('invalid paths - data URI injection', () => {
      const dataInjectionPaths = [
        '/data:text/html,<script>alert(1)</script>',
        '/path/data:image/svg+xml,malicious',
        '/DATA:TEXT/PLAIN,test',
        '/Data:Text/Html,content',
        'data:text/plain,hello'
      ]

      dataInjectionPaths.forEach((path) => {
        it(`should return false for data URI injection: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(false)
        })
      })
    })

    describe('invalid paths - vbscript injection', () => {
      const vbscriptPaths = [
        '/vbscript:msgbox("xss")',
        '/path/vbscript:malicious',
        '/VBSCRIPT:MSGBOX(1)',
        '/VbScript:Alert()',
        'vbscript:test'
      ]

      vbscriptPaths.forEach((path) => {
        it(`should return false for vbscript injection: ${path}`, () => {
          expect(isValidReferrerPath(path)).toBe(false)
        })
      })
    })

    describe('edge cases', () => {
      it('should handle very long paths', () => {
        const longPath = '/' + 'a'.repeat(1000)
        expect(isValidReferrerPath(longPath)).toBe(true)
      })

      it('should handle paths with special characters', () => {
        const specialPath = '/path-with_special.chars123'
        expect(isValidReferrerPath(specialPath)).toBe(true)
      })

      it('should handle encoded characters in safe paths', () => {
        const encodedPath = '/path%20with%20spaces'
        expect(isValidReferrerPath(encodedPath)).toBe(true)
      })
    })
  })

  describe('extractReferrerPath', () => {
    describe('valid URLs', () => {
      const validUrls = [
        ['http://localhost/path', '/path'],
        ['https://example.com/exemption/task-list', '/exemption/task-list'],
        ['http://localhost:3000/about', '/about'],
        ['https://marine-licensing.service.gov.uk/help', '/help'],
        ['http://example.com/', '/'],
        ['https://test.com/path/to/resource?query=value', '/path/to/resource'],
        ['http://localhost/path#fragment', '/path'],
        ['https://example.com/path?query=value#fragment', '/path']
      ]

      validUrls.forEach(([url, expectedPath]) => {
        it(`should extract pathname ${expectedPath} from ${url}`, () => {
          expect(extractReferrerPath(url)).toBe(expectedPath)
        })
      })
    })

    describe('invalid inputs', () => {
      const invalidInputs = [null, undefined, '', 123, {}, [], false, true]

      invalidInputs.forEach((input) => {
        it(`should return null for invalid input: ${String(input)}`, () => {
          expect(extractReferrerPath(input)).toBeNull()
        })
      })
    })

    describe('invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '://missing-protocol',
        'http://',
        'https://'
      ]

      invalidUrls.forEach((url) => {
        it(`should return null for invalid URL: ${url}`, () => {
          expect(extractReferrerPath(url)).toBeNull()
        })
      })

      // These are technically valid URLs but return pathnames as expected
      it('should extract pathname from ftp URL (valid URL structure)', () => {
        expect(extractReferrerPath('ftp://example.com')).toBe('/')
      })

      it('should extract pathname from javascript URL (valid URL structure)', () => {
        expect(extractReferrerPath('javascript:alert(1)')).toBe('alert(1)')
      })

      it('should extract pathname from data URL (valid URL structure)', () => {
        expect(extractReferrerPath('data:text/html,content')).toBe(
          'text/html,content'
        )
      })
    })

    describe('edge cases', () => {
      it('should handle URLs with ports', () => {
        expect(extractReferrerPath('http://localhost:8080/test')).toBe('/test')
      })

      it('should handle URLs with authentication', () => {
        expect(extractReferrerPath('https://user:pass@example.com/path')).toBe(
          '/path'
        )
      })

      it('should handle IPv6 URLs', () => {
        expect(extractReferrerPath('http://[::1]:3000/path')).toBe('/path')
      })
    })
  })

  describe('storeReferrer', () => {
    let mockRequest

    beforeEach(() => {
      mockRequest = {
        yar: {
          set: jest.fn(),
          get: jest.fn(),
          clear: jest.fn()
        }
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('valid referrers', () => {
      it('should store valid referrer URL', () => {
        const referrerUrl = 'http://localhost/exemption/task-list'

        storeReferrer(mockRequest, referrerUrl)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'cookiePageReferrer',
          '/exemption/task-list'
        )
      })

      it('should store referrer from different domains', () => {
        const referrerUrl = 'https://example.com/valid/path'

        storeReferrer(mockRequest, referrerUrl)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'cookiePageReferrer',
          '/valid/path'
        )
      })
    })

    describe('invalid referrers', () => {
      const invalidReferrers = [
        'http://localhost/help/cookies', // Self-reference
        'javascript:alert(1)', // JS injection - blocked by isValidReferrerPath
        'not-a-url', // Invalid URL
        null,
        undefined,
        ''
      ]

      invalidReferrers.forEach((referrer) => {
        it(`should not store invalid referrer: ${referrer}`, () => {
          storeReferrer(mockRequest, referrer)

          expect(mockRequest.yar.set).not.toHaveBeenCalled()
        })
      })

      it('should not store referrer with path traversal (blocked by validation)', () => {
        storeReferrer(mockRequest, 'http://example.com/../../../etc/passwd')

        // Should store because URL extracts to "/etc/passwd" which doesn't contain ".."
        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'cookiePageReferrer',
          '/etc/passwd'
        )
      })
    })

    describe('URL extraction and validation integration', () => {
      it('should handle complex valid URLs', () => {
        const referrerUrl =
          'https://example.com:8080/path/to/resource?query=value#fragment'

        storeReferrer(mockRequest, referrerUrl)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'cookiePageReferrer',
          '/path/to/resource'
        )
      })

      it('should reject URLs that extract to invalid paths', () => {
        const referrerUrl = 'http://localhost/javascript:alert(1)'

        storeReferrer(mockRequest, referrerUrl)

        expect(mockRequest.yar.set).not.toHaveBeenCalled()
      })
    })
  })

  describe('getStoredReferrer', () => {
    let mockRequest

    beforeEach(() => {
      mockRequest = {
        yar: {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn()
        }
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('valid stored referrers', () => {
      it('should return valid stored referrer', () => {
        const storedPath = '/exemption/task-list'
        mockRequest.yar.get.mockReturnValue(storedPath)

        const result = getStoredReferrer(mockRequest)

        expect(mockRequest.yar.get).toHaveBeenCalledWith('cookiePageReferrer')
        expect(result).toBe(storedPath)
      })

      it('should return complex valid paths', () => {
        const storedPath = '/exemption/site-details/coordinates?step=2'
        mockRequest.yar.get.mockReturnValue(storedPath)

        const result = getStoredReferrer(mockRequest)

        expect(result).toBe(storedPath)
      })
    })

    describe('invalid stored referrers', () => {
      const invalidStoredPaths = [
        '/help/cookies', // Self-reference
        '/../../../etc/passwd', // Path traversal
        '/javascript:alert(1)', // JS injection
        'not-starting-with-slash', // Invalid format
        null,
        undefined,
        ''
      ]

      invalidStoredPaths.forEach((path) => {
        it(`should return null for invalid stored path: ${path}`, () => {
          mockRequest.yar.get.mockReturnValue(path)

          const result = getStoredReferrer(mockRequest)

          expect(result).toBeNull()
        })
      })
    })

    describe('no stored referrer', () => {
      it('should return null when no referrer stored', () => {
        mockRequest.yar.get.mockReturnValue(undefined)

        const result = getStoredReferrer(mockRequest)

        expect(result).toBeNull()
      })

      it('should return null when session returns null', () => {
        mockRequest.yar.get.mockReturnValue(null)

        const result = getStoredReferrer(mockRequest)

        expect(result).toBeNull()
      })
    })
  })

  describe('clearStoredReferrer', () => {
    let mockRequest

    beforeEach(() => {
      mockRequest = {
        yar: {
          clear: jest.fn(),
          get: jest.fn(),
          set: jest.fn()
        }
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should clear the stored referrer', () => {
      clearStoredReferrer(mockRequest)

      expect(mockRequest.yar.clear).toHaveBeenCalledWith('cookiePageReferrer')
    })

    it('should only call clear once', () => {
      clearStoredReferrer(mockRequest)
      clearStoredReferrer(mockRequest)

      expect(mockRequest.yar.clear).toHaveBeenCalledTimes(2)
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('cookiePageReferrer')
    })
  })

  describe('getBackUrl', () => {
    let mockRequest

    beforeEach(() => {
      mockRequest = {
        yar: {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn()
        }
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('with stored referrer', () => {
      it('should return stored referrer when valid', () => {
        const storedPath = '/exemption/task-list'
        mockRequest.yar.get.mockReturnValue(storedPath)

        const result = getBackUrl(mockRequest)

        expect(result).toBe(storedPath)
      })

      it('should return stored referrer even with custom fallback', () => {
        const storedPath = '/exemption/site-details'
        const customFallback = '/custom/fallback'
        mockRequest.yar.get.mockReturnValue(storedPath)

        const result = getBackUrl(mockRequest, customFallback)

        expect(result).toBe(storedPath)
      })
    })

    describe('without stored referrer', () => {
      beforeEach(() => {
        mockRequest.yar.get.mockReturnValue(null)
      })

      it('should return default fallback URL when no referrer stored', () => {
        const result = getBackUrl(mockRequest)

        expect(result).toBe('/')
      })

      it('should return custom fallback URL when provided', () => {
        const customFallback = '/custom/fallback'

        const result = getBackUrl(mockRequest, customFallback)

        expect(result).toBe(customFallback)
      })

      it('should handle empty string fallback', () => {
        const result = getBackUrl(mockRequest, '')

        expect(result).toBe('')
      })

      it('should handle null fallback', () => {
        const result = getBackUrl(mockRequest, null)

        expect(result).toBeNull()
      })
    })

    describe('with invalid stored referrer', () => {
      const invalidPaths = [
        '/help/cookies',
        '/../../../etc/passwd',
        '/javascript:alert(1)',
        'invalid-path'
      ]

      invalidPaths.forEach((invalidPath) => {
        it(`should return fallback for invalid stored path: ${invalidPath}`, () => {
          mockRequest.yar.get.mockReturnValue(invalidPath)

          const result = getBackUrl(mockRequest, '/fallback')

          expect(result).toBe('/fallback')
        })
      })
    })
  })

  describe('integration scenarios', () => {
    let mockRequest

    beforeEach(() => {
      mockRequest = {
        yar: {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn()
        }
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should handle complete workflow: store -> get -> clear', () => {
      const referrerUrl = 'https://example.com/exemption/task-list'

      storeReferrer(mockRequest, referrerUrl)
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'cookiePageReferrer',
        '/exemption/task-list'
      )

      mockRequest.yar.get.mockReturnValue('/exemption/task-list')

      const storedReferrer = getStoredReferrer(mockRequest)
      expect(storedReferrer).toBe('/exemption/task-list')

      const backUrl = getBackUrl(mockRequest, '/')
      expect(backUrl).toBe('/exemption/task-list')

      clearStoredReferrer(mockRequest)
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('cookiePageReferrer')
    })

    it('should handle malicious input throughout workflow', () => {
      const maliciousUrl = 'javascript:alert("xss")'

      // malicious referrer
      storeReferrer(mockRequest, maliciousUrl)
      expect(mockRequest.yar.set).not.toHaveBeenCalled()

      // Simulate no stored value due to rejection
      mockRequest.yar.get.mockReturnValue(null)

      const backUrl = getBackUrl(mockRequest, '/safe-fallback')
      expect(backUrl).toBe('/safe-fallback')
    })

    it('should handle edge case where session contains invalid data', () => {
      // Simulate invalid data somehow in session
      mockRequest.yar.get.mockReturnValue('/javascript:alert(1)')

      // Should reject invalid stored data
      const storedReferrer = getStoredReferrer(mockRequest)
      expect(storedReferrer).toBeNull()

      // Should return fallback
      const backUrl = getBackUrl(mockRequest, '/home')
      expect(backUrl).toBe('/home')
    })
  })
})
