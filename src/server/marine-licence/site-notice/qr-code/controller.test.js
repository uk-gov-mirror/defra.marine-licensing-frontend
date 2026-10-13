import { load } from 'cheerio'
import { setupTestServer } from '#tests/integration/shared/test-setup-helpers.js'
import { config } from '#src/config/config.js'
import { statusCodes } from '#src/server/common/constants/status-codes.js'
import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'

describe('#siteNoticeQrCodeController', () => {
  const getServer = setupTestServer()

  const getPage = async (query) => {
    const queryString = query ? `?${new URLSearchParams(query)}` : ''
    const { statusCode, result } = await getServer().inject({
      method: 'GET',
      url: `${marineLicenceRoutes.MARINE_LICENCE_SITE_NOTICE_QR_CODE}${queryString}`
    })
    return { statusCode, $: load(result) }
  }

  test('is available without signing in and shows the form on first visit', async () => {
    const { statusCode, $ } = await getPage()

    expect(statusCode).toBe(statusCodes.ok)
    expect($('h1').text().trim()).toBe('Generate a site notice QR code')
    expect($('#baseUrl').val()).toBe(config.get('appBaseUrl'))
    expect($('[data-testid="app-site-notice-qr-code"]')).toHaveLength(0)
  })

  test('shows the QR code for a valid submission', async () => {
    const { $ } = await getPage({
      baseUrl: 'https://marine-licensing-frontend.test.cdp-int.defra.cloud/',
      marineLicenceId: '6a7c4c11726ee5b252f27321',
      size: '250'
    })

    expect($('.govuk-error-summary')).toHaveLength(0)
    expect(
      $('[data-testid="app-site-notice-qr-code-image"] svg').attr('width')
    ).toBe('250')
    expect($('[data-testid="app-site-notice-qr-code-caption"] a').text()).toBe(
      'https://marine-licensing-frontend.test.cdp-int.defra.cloud/marine-licence/view-public-details/6a7c4c11726ee5b252f27321'
    )
  })

  test('shows errors for an invalid submission', async () => {
    const { $ } = await getPage({
      baseUrl: 'ftp://example.gov.uk',
      marineLicenceId: '',
      size: '5'
    })

    expect(
      $('.govuk-error-summary__list a')
        .map((_i, el) => $(el).text().trim())
        .get()
    ).toEqual([
      'Enter a base URL starting with http:// or https://',
      'Enter a marine licence ID',
      'Size must be at least 60 pixels'
    ])
    expect($('#baseUrl').val()).toBe('ftp://example.gov.uk')
    expect($('#size-error').text()).toContain('Size must be at least 60 pixels')
    expect($('[data-testid="app-site-notice-qr-code"]')).toHaveLength(0)
  })
})
