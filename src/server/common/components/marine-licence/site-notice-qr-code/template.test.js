import { renderComponent } from '#src/server/test-helpers/component-helpers.js'

describe('Marine Licence Site Notice QR Code', () => {
  const params = {
    url: 'https://marine-licensing-frontend.test.cdp-int.defra.cloud/marine-licence/view-public-details/abc123',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 37 37"></svg>'
  }

  let $component

  beforeEach(() => {
    $component = renderComponent('marine-licence/site-notice-qr-code', params)
  })

  test('should render the SVG unescaped', () => {
    expect(
      $component('[data-testid="app-site-notice-qr-code-image"] svg')
    ).toHaveLength(1)
  })

  test('should give the QR code an accessible name', () => {
    const $image = $component('[data-testid="app-site-notice-qr-code-image"]')

    expect($image.attr('role')).toBe('img')
    expect($image.attr('aria-label')).toBe(
      'QR code linking to the public details page for this application'
    )
  })

  test('should show the URL as a link for people who cannot scan', () => {
    const $link = $component(
      '[data-testid="app-site-notice-qr-code-caption"] a'
    )

    expect($link.attr('href')).toBe(params.url)
    expect($link.text()).toBe(params.url)
  })

  test('should escape the URL', () => {
    const $escaped = renderComponent('marine-licence/site-notice-qr-code', {
      ...params,
      url: 'https://example.gov.uk/"><script>alert(1)</script>'
    })

    expect($escaped('script')).toHaveLength(0)
  })
})
