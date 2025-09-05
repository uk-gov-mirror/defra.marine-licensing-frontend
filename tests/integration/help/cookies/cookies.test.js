import { JSDOM } from 'jsdom'
import { getByRole, getByText, within } from '@testing-library/dom'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { setupTestServer } from '~/tests/integration/shared/test-setup-helpers.js'

describe('Cookies page', () => {
  const getServer = setupTestServer()

  describe('GET /help/cookies', () => {
    test('AC1: Should navigate to cookies page from footer link', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      expect(
        getByRole(document, 'heading', {
          level: 1,
          name: 'Cookies on Get permission for marine work'
        })
      ).toBeInTheDocument()
    })

    test('AC2: Should display all cookie types with "No" selected when no decision made', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      expect(
        getByRole(document, 'heading', {
          level: 2,
          name: 'Essential cookies'
        })
      ).toBeInTheDocument()

      expect(
        getByRole(document, 'heading', {
          level: 2,
          name: 'Analytics cookies (optional)'
        })
      ).toBeInTheDocument()

      const tables = document.querySelectorAll('.govuk-table')
      expect(tables.length).toBeGreaterThanOrEqual(2)

      expect(getByText(document, 'session')).toBeInTheDocument()
      expect(getByText(document, 'userSession')).toBeInTheDocument()
      expect(getByText(document, 'csrfToken')).toBeInTheDocument()
      expect(getByText(document, 'cookies_preferences_set')).toBeInTheDocument()
      expect(getByText(document, 'cookies_policy')).toBeInTheDocument()

      expect(
        getByRole(document, 'heading', {
          level: 3,
          name: 'Microsoft Clarity cookies'
        })
      ).toBeInTheDocument()

      // Verify "No" is selected by default
      const noRadio = getByRole(document, 'radio', { name: 'No' })
      expect(noRadio).toBeChecked()

      const yesRadio = getByRole(document, 'radio', { name: 'Yes' })
      expect(yesRadio).not.toBeChecked()
    })

    test('AC3: Should display "No" selected when analytics cookies not accepted', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies',
        headers: {
          cookie:
            'cookies_policy=eyJlc3NlbnRpYWwiOnRydWUsImFuYWx5dGljcyI6ZmFsc2UsInRpbWVzdGFtcCI6MTcwNDA0MDAwMH0=; cookies_preferences_set=true'
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const noRadio = getByRole(document, 'radio', { name: 'No' })
      expect(noRadio).toBeChecked()

      const yesRadio = getByRole(document, 'radio', { name: 'Yes' })
      expect(yesRadio).not.toBeChecked()
    })

    test('AC4: Should display "Yes" selected when analytics cookies accepted', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies',
        headers: {
          cookie:
            'cookies_policy=eyJlc3NlbnRpYWwiOnRydWUsImFuYWx5dGljcyI6dHJ1ZSwidGltZXN0YW1wIjoxNzA0MDQwMDAwfQ==; cookies_preferences_set=true'
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const yesRadio = getByRole(document, 'radio', { name: 'Yes' })
      expect(yesRadio).toBeChecked()

      const noRadio = getByRole(document, 'radio', { name: 'No' })
      expect(noRadio).not.toBeChecked()
    })

    test('AC7: Should show back link that goes to previous page', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies',
        headers: {
          referer: 'http://localhost/exemption/task-list'
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const backLink = getByRole(document, 'link', { name: 'Back' })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/exemption/task-list')
    })

    test('Should not show back link to cookies page itself', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies',
        headers: {
          referer: 'http://localhost/help/cookies'
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const backLink = getByRole(document, 'link', { name: 'Back' })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/')
    })

    test('Should show success banner when returning from save', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies?success=true'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const banner = document.querySelector(
        '.govuk-notification-banner--success'
      )
      expect(banner).toBeInTheDocument()

      expect(
        getByText(banner, /Your cookie preferences were saved/)
      ).toBeInTheDocument()

      const returnLink = within(banner).getByRole('link', {
        name: 'Go back to the previous page'
      })
      expect(returnLink).toBeInTheDocument()
    })

    test('AC10: Should not show Sign Out link for unauthenticated users', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const signOutLink = document.querySelector('a[href*="sign-out"]')
      expect(signOutLink).not.toBeInTheDocument()
    })
  })

  describe('POST /help/cookies', () => {
    test('AC5: Should accept analytics cookies and redirect with success', async () => {
      const response = await getServer().inject({
        method: 'POST',
        url: '/help/cookies',
        payload: {
          analytics: 'yes'
        }
      })

      expect(response.statusCode).toBe(statusCodes.redirect)
      expect(response.headers.location).toBe('/help/cookies?success=true')

      // Check cookies are set
      const setCookieHeaders = response.headers['set-cookie']
      expect(setCookieHeaders).toBeDefined()

      const cookieString = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.join('; ')
        : setCookieHeaders

      expect(cookieString).toContain('cookies_policy=')
      expect(cookieString).toContain('cookies_preferences_set=true')
    })

    test('AC6: Should reject analytics cookies and redirect with success', async () => {
      const response = await getServer().inject({
        method: 'POST',
        url: '/help/cookies',
        payload: {
          analytics: 'no'
        }
      })

      expect(response.statusCode).toBe(statusCodes.redirect)
      expect(response.headers.location).toBe('/help/cookies?success=true')

      // Check cookies are set
      const setCookieHeaders = response.headers['set-cookie']
      expect(setCookieHeaders).toBeDefined()

      const cookieString = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.join('; ')
        : setCookieHeaders

      expect(cookieString).toContain('cookies_policy=')
      expect(cookieString).toContain('cookies_preferences_set=true')
    })
  })

  describe('Cookie preferences functionality', () => {
    test('AC9: Should show correct back link on confirmation page', async () => {
      // First navigate to cookies page from a specific page
      const getResponse = await getServer().inject({
        method: 'GET',
        url: '/help/cookies',
        headers: {
          referer: 'http://localhost/exemption/site-name'
        }
      })

      const getCookies = getResponse.headers['set-cookie']
      const sessionCookie = Array.isArray(getCookies)
        ? getCookies.join('; ')
        : getCookies || ''

      // Save preferences
      const postResponse = await getServer().inject({
        method: 'POST',
        url: '/help/cookies',
        payload: {
          analytics: 'yes'
        },
        headers: {
          cookie: sessionCookie
        }
      })

      expect(postResponse.statusCode).toBe(statusCodes.redirect)

      const postCookies = postResponse.headers['set-cookie']
      const allCookies = [
        sessionCookie,
        Array.isArray(postCookies) ? postCookies.join('; ') : postCookies || ''
      ]
        .filter((c) => c)
        .join('; ')

      const successResponse = await getServer().inject({
        method: 'GET',
        url: postResponse.headers.location,
        headers: {
          cookie: allCookies
        }
      })

      const { document } = new JSDOM(successResponse.result).window

      const banner = document.querySelector(
        '.govuk-notification-banner--success'
      )
      expect(banner).toBeInTheDocument()

      const returnLink = within(banner).getByRole('link', {
        name: 'Go back to the previous page'
      })

      expect(returnLink).toBeInTheDocument()
      // The back URL should be available from the session
      expect(returnLink.getAttribute('href')).toBeTruthy()
    })
  })

  describe('Form elements', () => {
    test('Should have correct form elements', async () => {
      const { result, statusCode } = await getServer().inject({
        method: 'GET',
        url: '/help/cookies'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { document } = new JSDOM(result).window

      const fieldset = document.querySelector('fieldset')
      expect(fieldset).toBeInTheDocument()

      const legend = within(fieldset).getByText(
        'Do you want to accept analytics cookies?'
      )
      expect(legend).toBeInTheDocument()

      const saveButton = getByRole(document, 'button', {
        name: 'Save cookie settings'
      })
      expect(saveButton).toBeInTheDocument()
      expect(saveButton).toHaveAttribute('type', 'submit')

      const form = document.querySelector('form')
      expect(form).toHaveAttribute('method', 'post')
      expect(form).toHaveAttribute('novalidate')
    })
  })
})
