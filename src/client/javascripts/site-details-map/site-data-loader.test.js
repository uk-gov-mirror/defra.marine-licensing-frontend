import SiteDataLoader from './site-data-loader.js'

Object.defineProperty(globalThis, 'document', {
  value: {
    getElementById: jest.fn()
  },
  writable: true
})

describe('SiteDataLoader', () => {
  let siteDataLoader

  beforeEach(() => {
    jest.clearAllMocks()
    siteDataLoader = new SiteDataLoader()
  })

  describe('loadSiteDetails', () => {
    test('should return null when element does not exist', () => {
      document.getElementById.mockReturnValue(null)

      const result = siteDataLoader.loadSiteDetails()

      expect(document.getElementById).toHaveBeenCalledWith('site-details-data')
      expect(result).toBeNull()
    })

    test('should parse and return site details when element exists', () => {
      const siteDetails = { coordinatesType: 'coordinates', coordinates: {} }
      const mockElement = {
        textContent: JSON.stringify(siteDetails)
      }
      document.getElementById.mockReturnValue(mockElement)

      const result = siteDataLoader.loadSiteDetails()

      expect(result).toEqual(siteDetails)
    })

    test('should throw error when JSON parsing fails', () => {
      const mockElement = {
        textContent: 'invalid json'
      }
      document.getElementById.mockReturnValue(mockElement)

      expect(() => siteDataLoader.loadSiteDetails()).toThrow()
    })
  })

  describe('hasValidFileCoordinates', () => {
    test('should return true for valid file coordinates', () => {
      const siteDetails = {
        coordinatesType: 'file',
        geoJSON: { features: [] }
      }

      const result = siteDataLoader.hasValidFileCoordinates(siteDetails)

      expect(result).toBe(true)
    })

    test('should return false when coordinatesType is not file', () => {
      const siteDetails = {
        coordinatesType: 'coordinates',
        geoJSON: { features: [] }
      }

      const result = siteDataLoader.hasValidFileCoordinates(siteDetails)

      expect(result).toBe(false)
    })

    test('should return false when geoJSON is null', () => {
      const siteDetails = {
        coordinatesType: 'file',
        geoJSON: null
      }

      const result = siteDataLoader.hasValidFileCoordinates(siteDetails)

      expect(result).toBe(false)
    })

    test('should return false when geoJSON is not an object', () => {
      const siteDetails = {
        coordinatesType: 'file',
        geoJSON: 'string'
      }

      const result = siteDataLoader.hasValidFileCoordinates(siteDetails)

      expect(result).toBe(false)
    })
  })

  describe('hasManualCoordinates', () => {
    test('should return true for manual coordinates', () => {
      const siteDetails = {
        coordinatesType: 'coordinates'
      }

      const result = siteDataLoader.hasManualCoordinates(siteDetails)

      expect(result).toBe(true)
    })

    test('should return false for non-manual coordinates', () => {
      const siteDetails = {
        coordinatesType: 'file'
      }

      const result = siteDataLoader.hasManualCoordinates(siteDetails)

      expect(result).toBe(false)
    })
  })

  describe('hasValidManualCoordinates', () => {
    test('should return true for valid manual coordinates', () => {
      const siteDetails = {
        coordinatesType: 'coordinates',
        coordinates: { latitude: '51.5', longitude: '-0.1' }
      }

      const result = siteDataLoader.hasValidManualCoordinates(siteDetails)

      expect(result).toBe(true)
    })

    test('should return false when not manual coordinates', () => {
      const siteDetails = {
        coordinatesType: 'file',
        coordinates: { latitude: '51.5', longitude: '-0.1' }
      }

      const result = siteDataLoader.hasValidManualCoordinates(siteDetails)

      expect(result).toBe(false)
    })

    test('should return false when coordinates is missing', () => {
      const siteDetails = {
        coordinatesType: 'coordinates'
      }

      const result = siteDataLoader.hasValidManualCoordinates(siteDetails)

      expect(result).toBe(false)
    })
  })
})
