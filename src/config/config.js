import convict from 'convict'
import { appSchema } from './schema/app.js'
import { authSchema } from './schema/auth.js'
import { journeysSchema } from './schema/journeys.js'
import { logSchema } from './schema/logging.js'
import { servicesSchema } from './schema/services.js'
import { sessionSchema } from './schema/session.js'

export {
  isCdpProductionLikeEnvironment,
  isNotCdpProductionLikeEnvironment
} from './formats.js'

export const config = convict({
  ...appSchema,
  ...journeysSchema,
  ...logSchema,
  ...sessionSchema,
  ...servicesSchema,
  ...authSchema
})

config.validate({ allowed: 'strict' })

const environment = config.get('cdpEnvironment')
if (
  (environment === 'prod' || environment === 'perf-test') &&
  !config.get('clarityProjectId')
) {
  // eslint-disable-next-line no-console
  console.warn(
    `\n⚠️  WARNING: CLARITY_PROJECT_ID is not set for ${environment} environment\n`
  )
}
