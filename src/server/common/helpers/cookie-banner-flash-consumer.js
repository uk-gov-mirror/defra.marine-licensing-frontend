/**
 * Step 1: Consume flash message early in request lifecycle (onPostAuth timing)
 * This ensures session changes are persisted before response headers are sent
 * @param {Request} request
 * @param {ResponseToolkit} h
 */
export function cookieBannerFlashConsumer(request, h) {
  const [showCookieConfirmationBanner] = request.yar.flash(
    'showCookieConfirmationBanner'
  )

  // Store for later processing
  request.cookieConfirmationBanner = showCookieConfirmationBanner || false

  return h.continue
}

/**
 * Step 2: Inject consumed flash message into response context (onPreResponse timing)
 * @param {Request} request
 * @param {ResponseToolkit} h
 */
export function cookieBannerContextInjector(request, h) {
  const { response } = request

  if (response.variety === 'view') {
    response.source.context = {
      ...response.source.context,
      showCookieConfirmationBanner: request.cookieConfirmationBanner
    }
  }

  return h.continue
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
