import {
  isDevelopment,
  isProduction,
  isTest,
  localhost,
  oneWeekMs,
  projectRoot
} from '../env.js'
import { requiredFromEnvInCdp } from '../formats.js'

export const appSchema = {
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Get permission for marine work'
  },
  appBaseUrl: {
    doc: 'Base URL for the application (used for CDP upload redirects)',
    format: requiredFromEnvInCdp,
    default: localhost,
    env: 'APP_BASE_URL'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: projectRoot
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  clarityProjectId: {
    doc: 'Microsoft Clarity Project ID',
    format: String,
    default: '',
    env: 'CLARITY_PROJECT_ID'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is currently in, with the addition of "local"',
    format: ['local', 'dev', 'test', 'perf-test', 'ext-test', 'prod'],
    default: process.env.ENVIRONMENT ?? 'local'
  },
  enableBrowserLogging: {
    doc: 'Enable / disable browser logging in the browser and at the api level',
    format: Boolean,
    default: true,
    env: 'ENABLE_BROWSER_LOGGING'
  }
}
