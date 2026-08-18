import { fiftyMB, localhost } from '../env.js'
import { requiredFromEnvInCdp } from '../formats.js'

export const servicesSchema = {
  backend: {
    apiUrl: {
      doc: 'Endpoint for the backend API service',
      format: requiredFromEnvInCdp,
      nullable: true,
      default: 'http://localhost:3001',
      env: 'MARINE_LICENSING_BACKEND_API_URL'
    }
  },
  addressLookup: {
    apiUrl: {
      doc: 'Endpoint for the DEFRA address lookup API',
      format: requiredFromEnvInCdp,
      nullable: true,
      default: 'http://localhost:3002/api/address-lookup/v2.1/addresses',
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_API_URL'
    },
    oauthTokenUrl: {
      doc: 'Full OAuth client credentials token endpoint URL for the address lookup API',
      format: requiredFromEnvInCdp,
      nullable: true,
      default: 'http://localhost:3002/oauth2/v2.0/token',
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_OAUTH_TOKEN_URL'
    },
    clientId: {
      doc: 'OAuth client id for the address lookup API',
      format: requiredFromEnvInCdp,
      nullable: true,
      default: 'local-stub-client-id',
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_CLIENT_ID'
    },
    clientSecret: {
      doc: 'OAuth client secret for the address lookup API',
      format: requiredFromEnvInCdp,
      nullable: true,
      sensitive: true,
      default: 'local-stub-client-secret',
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_CLIENT_SECRET'
    },
    clientScope: {
      doc: 'OAuth scope requested for the address lookup API',
      format: requiredFromEnvInCdp,
      nullable: true,
      default: 'api://stub/.default',
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_CLIENT_SCOPE'
    },
    redirectUri: {
      doc: 'OAuth redirect uri sent when requesting an address lookup API token',
      format: requiredFromEnvInCdp,
      nullable: true,
      default: localhost,
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_REDIRECT_URI'
    },
    maxResults: {
      doc: 'Maximum addresses requested per lookup. Sent explicitly rather than relying on the API default, because property name/number filtering happens client-side over whatever is returned',
      format: Number,
      default: 100,
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_MAX_RESULTS'
    },
    timeout: {
      doc: 'Deadline for a whole address lookup, including any token fetch and retry, in milliseconds',
      format: Number,
      default: 10000,
      env: 'MARINE_LICENSING_ADDRESS_LOOKUP_TIMEOUT'
    }
  },
  cdpUploader: {
    cdpUploadServiceBaseUrl: {
      doc: 'CDP Uploader service base URL',
      format: requiredFromEnvInCdp,
      default: 'http://localhost:7337',
      env: 'CDP_UPLOADER_BASE_URL'
    },
    timeout: {
      doc: 'Request timeout for CDP Uploader calls in milliseconds',
      format: Number,
      default: 30000,
      env: 'CDP_UPLOADER_TIMEOUT'
    },
    maxFileSize: {
      doc: 'Maximum file size in bytes (50MB)',
      format: Number,
      default: fiftyMB,
      env: 'CDP_UPLOADER_MAX_FILE_SIZE'
    },
    s3Bucket: {
      doc: 'S3 Bucket for uploads to be placed in after the virus scan',
      format: requiredFromEnvInCdp,
      default: 'mmo-uploads',
      env: 'CDP_UPLOAD_BUCKET'
    }
  }
}
