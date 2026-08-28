import { requiredFromEnvInCdp } from './required-from-env-in-cdp.js'

export const publicRegisterSchema = {
  apiUrl: {
    doc: 'Endpoint for the marine licensing public register API service',
    format: requiredFromEnvInCdp,
    nullable: true,
    default: 'http://localhost:3003',
    env: 'MARINE_LICENSING_PUBLIC_REGISTER_API_URL'
  }
}
