import { localhost } from '../env.js'
import { requiredFromEnvInCdp } from '../formats.js'

export const authSchema = {
  defraId: {
    accountManagementUrl: {
      doc: 'Defra ID account management portal URL',
      format: requiredFromEnvInCdp,
      env: 'DEFRA_ID_ACCOUNT_MANAGEMENT_URL',
      default: '#'
    },
    oidcConfigurationUrl: {
      doc: 'Defra ID OIDC Configuration URL',
      format: requiredFromEnvInCdp,
      default:
        'http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration',
      env: 'DEFRA_ID_OIDC_CONFIGURATION_URL'
    },
    clientId: {
      doc: 'The Defra Identity client ID.',
      format: requiredFromEnvInCdp,
      default: 'client-test',
      env: 'DEFRA_ID_CLIENT_ID'
    },
    clientSecret: {
      doc: 'The Defra Identity client secret.',
      format: requiredFromEnvInCdp,
      default: 'test_value',
      env: 'DEFRA_ID_CLIENT_SECRET',
      sensitive: true
    },
    serviceId: {
      doc: 'The Defra Identity service ID.',
      format: requiredFromEnvInCdp,
      default: 'service-test',
      env: 'DEFRA_ID_SERVICE_ID'
    },
    scopes: {
      doc: 'Defra ID Scopes',
      format: Array,
      sensitive: true,
      env: 'AUTH_DEFRA_ID_SCOPES',
      default: ['openid', 'offline_access']
    },
    redirectUrl: {
      doc: 'The Defra Identity redirect URl.',
      format: String,
      default: localhost,
      env: 'APP_BASE_URL'
    },
    cspRedirectHosts: {
      doc: 'The Defra ID hosts that are redirected to before signin, for CSP form-action',
      format: Array,
      default: [],
      env: 'DEFRA_ID_REDIRECT_HOSTS'
    },
    refreshTokens: {
      doc: 'True if Defra Identity refresh tokens are enabled.',
      format: Boolean,
      default: true,
      env: 'DEFRA_ID_REFRESH_TOKENS'
    }
  },
  entraId: {
    oidcConfigurationUrl: {
      doc: 'Entra ID OIDC configuration URL',
      format: requiredFromEnvInCdp,
      env: 'ENTRA_ID_OIDC_CONFIGURATION_URL',
      default:
        'http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration'
    },
    clientId: {
      doc: 'ENTRA ID client ID',
      format: requiredFromEnvInCdp,
      env: 'ENTRA_ID_CLIENT_ID',
      default: 'entra-test'
    },
    clientSecret: {
      doc: 'ENTRA ID client secret',
      format: requiredFromEnvInCdp,
      sensitive: true,
      env: 'ENTRA_ID_CLIENT_SECRET',
      default: 'test_value'
    },
    scopes: {
      doc: 'ENTRA ID scopes',
      format: Array,
      sensitive: true,
      env: 'ENTRA_ID_SCOPES',
      default: ['api://f68226cb-8dbc-44ef-a24e-d4e4835b16ff/.default']
    },
    redirectUrl: {
      doc: 'ENTRA ID redirect URl.',
      format: String,
      default: localhost,
      env: 'APP_BASE_URL'
    },
    teamAdminEmails: {
      doc: 'Team admin emails',
      format: Array,
      default: [],
      env: 'ENTRA_ID_TEAM_ADMIN_EMAILS'
    }
  }
}
