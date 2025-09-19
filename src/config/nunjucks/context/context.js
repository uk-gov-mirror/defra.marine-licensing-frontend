import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { buildNavigation } from '~/src/config/nunjucks/context/build-navigation.js'
import { routes } from '~/src/server/common/constants/routes.js'
import {
  areAnalyticsCookiesAccepted,
  getCookiePreferences
} from '~/src/server/common/helpers/cookie-preferences.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

/** @type {Record<string, string> | undefined} */
let webpackManifest

/**
 * @param {Request | null} request
 */
export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  const navigation =
    request.path === routes.PROJECT_NAME ? [] : buildNavigation(request)
  const analyticsEnabled = areAnalyticsCookiesAccepted(request)
  const isAuthenticated = request?.auth?.isAuthenticated ?? false

  const cookiePolicy = getCookiePreferences(request)
  const hasSetCookiePreferences =
    request.state?.cookies_preferences_set === 'true'

  // Cookie banner display logic - showCookieConfirmationBanner is handled by flash consumer hooks

  const showCookieBanner = !hasSetCookiePreferences
  const isOnCookiesPage = request.path === routes.COOKIES
  const currentUrl = request.path + (request.url.search || '')

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    breadcrumbs: [],
    navigation,
    isAuthenticated,
    analyticsEnabled,
    clarityProjectId: config.get('clarityProjectId'),
    cookiePolicy,
    showCookieBanner: showCookieBanner && !isOnCookiesPage,
    currentUrl,
    /**
     * @param {string} asset
     */
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
