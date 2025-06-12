import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'

async function getOidcConfig() {
  const { payload } = await Wreck.get(
    config.get('defraId.oidcConfigurationUrl'),
    {
      json: true
    }
  )

  return payload
}

export { getOidcConfig }
