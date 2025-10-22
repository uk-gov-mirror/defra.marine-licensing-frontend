import { getBackRoute } from '#src/server/exemption/site-details/coordinates-entry/utils.js'
import { routes } from '#src/server/common/constants/routes.js'
import { mockExemption, mockSite } from '#src/server/test-helpers/mocks.js'

describe('#coordinatesEntryUtils', () => {
  describe('#getBackRoute', () => {
    test('should return to correct page when first site', () => {
      const request = {
        site: { ...mockSite, siteIndex: 0 }
      }

      const result = getBackRoute(request, mockExemption)

      expect(result).toBe(routes.ACTIVITY_DESCRIPTION)
    })

    test('should return to correct page when same activity description for all sites is chosen', () => {
      const request = {
        site: {
          ...mockSite,
          siteIndex: 1,
          queryParams: '?site=1'
        }
      }

      const exemption = {
        ...mockExemption,
        multipleSiteDetails: {
          ...mockExemption.multipleSiteDetails,
          sameActivityDescription: 'yes'
        }
      }

      const result = getBackRoute(request, exemption)

      expect(result).toBe(routes.SITE_NAME + '?site=1')
    })

    test('should return to correct page when same activity description for all sites is not chosen', () => {
      const request = {
        site: {
          ...mockSite,
          siteIndex: 1,
          queryParams: '?site=1'
        }
      }

      const exemption = {
        ...mockExemption,
        multipleSiteDetails: {
          ...mockExemption.multipleSiteDetails,
          sameActivityDescription: 'no'
        }
      }

      const result = getBackRoute(request, exemption)

      expect(result).toBe(routes.ACTIVITY_DESCRIPTION + '?site=1')
    })
  })
})
