import yar from '@hapi/yar'

import { config } from '#src/config/config.js'

const sessionConfig = config.get('session')
export const sessionCache = {
  plugin: yar,
  options: {
    name: sessionConfig.cache.name,
    lazy: false,
    cache: {
      cache: sessionConfig.cache.name,
      expiresIn: sessionConfig.cache.ttl
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: sessionConfig.cookie.password,
      ttl: sessionConfig.cookie.ttl,
      isSecure: config.get('session.cookie.secure'),
      clearInvalid: true
    }
  }
}
