import { Cluster, Redis } from 'ioredis'

import { createLogger } from '#src/server/common/helpers/logging/logger.js'

const REDIS_PORT = 6379
const REDIS_DB = 0
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 50
const MAX_RETRY_DELAY_MS = 2000

export function buildRedisClient(redisConfig) {
  const logger = createLogger()
  const port = REDIS_PORT
  const db = REDIS_DB
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  // Common options for immediate writes without buffering
  const commonOptions = {
    enableOfflineQueue: false, // Don't queue commands when disconnected - fail fast
    enableReadyCheck: true, // Wait for Redis to be ready before accepting commands
    lazyConnect: false, // Connect immediately on creation
    maxRetriesPerRequest: MAX_RETRIES, // Retry failed commands up to 3 times
    retryStrategy: (times) => {
      // Exponential backoff: 50ms, 100ms, 200ms, etc., max 2 seconds
      const delay = Math.min(times * RETRY_BASE_DELAY_MS, MAX_RETRY_DELAY_MS)
      return delay
    }
  }

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      ...credentials,
      ...tls,
      ...commonOptions
    })
  } else {
    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 10000,
        dnsLookup: (address, callback) => callback(null, address),
        ...commonOptions,
        redisOptions: {
          db,
          ...credentials,
          ...tls
        }
      }
    )
  }

  redisClient.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  redisClient.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return redisClient
}
