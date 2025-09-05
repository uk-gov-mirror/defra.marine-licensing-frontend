export function isValidReferrerPath(referrerPath) {
  if (!referrerPath || typeof referrerPath !== 'string') {
    return false
  }

  if (!referrerPath.startsWith('/')) {
    return false
  }

  if (referrerPath === '/help/cookies') {
    return false
  }

  const suspiciousPatterns = [
    /\.\./,
    /\/\//,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ]

  if (suspiciousPatterns.some((pattern) => pattern.test(referrerPath))) {
    return false
  }

  return true
}

export function extractReferrerPath(referrerUrl) {
  if (!referrerUrl || typeof referrerUrl !== 'string') {
    return null
  }

  try {
    const referrer = new URL(referrerUrl)
    return referrer.pathname
  } catch {
    // Invalid URL
    return null
  }
}

export function storeReferrer(request, referrerUrl) {
  const referrerPath = extractReferrerPath(referrerUrl)

  if (referrerPath && isValidReferrerPath(referrerPath)) {
    request.yar.set('cookiePageReferrer', referrerPath)
  }
}

export function getStoredReferrer(request) {
  const storedReferrerPath = request.yar.get('cookiePageReferrer')

  if (storedReferrerPath && isValidReferrerPath(storedReferrerPath)) {
    return storedReferrerPath
  }

  return null
}

export function clearStoredReferrer(request) {
  request.yar.clear('cookiePageReferrer')
}

export function getBackUrl(request, fallbackUrl = '/') {
  const storedReferrer = getStoredReferrer(request)
  return storedReferrer || fallbackUrl
}
