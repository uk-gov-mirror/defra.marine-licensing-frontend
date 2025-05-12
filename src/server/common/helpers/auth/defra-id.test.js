import fetch from 'node-fetch'
import jwt from '@hapi/jwt'
import bell from '@hapi/bell'

import { config } from '~/src/config/config.js'
import { defraId } from './defra-id.js'

describe('defraId plugin', () => {
  let server
  let fakeOidc
  const discoveryUrl = 'http://stub/.well-known/openid-configuration'
  const baseUrl = 'http://app.test'

  beforeEach(() => {
    jest.clearAllMocks()

    jest.spyOn(config, 'get').mockImplementation(
      (key) =>
        ({
          defraIdOidcConfigurationUrl: discoveryUrl,
          defraIdServiceId: 'svc-id',
          defraIdClientId: 'client-id',
          defraIdClientSecret: 'secret-val',
          appBaseUrl: baseUrl,
          'session.cookie.password': 'cookie-pass'
        })[key]
    )

    // fake OIDC discovery doc
    fakeOidc = {
      authorization_endpoint: 'https://auth/',
      token_endpoint: 'https://token/',
      end_session_endpoint: 'https://logout/'
    }
    fetch.mockResolvedValue({ json: () => Promise.resolve(fakeOidc) })

    // stub JWT decode
    jwt.token.decode = jest.fn().mockReturnValue({
      decoded: {
        payload: {
          sub: 'user-123',
          correlationId: 'corr-1',
          sessionId: 'sess-1',
          contactId: 'cont-1',
          serviceId: 'svc-1',
          firstName: 'Dimitri',
          lastName: 'Alpha',
          uniqueReference: 'u-ref',
          email: 'dimitri@alpha.com',
          loa: '1',
          aal: '1',
          enrolmentCount: 2,
          enrolmentRequestCount: 1,
          currentRelationshipId: 'rel-1',
          relationships: ['org-1'],
          roles: ['r1']
        }
      }
    })

    server = {
      register: jest.fn().mockResolvedValue(),
      auth: {
        strategy: jest.fn(),
        default: jest.fn()
      },
      ext: jest.fn()
    }
  })

  it('registers Bell, fetches discovery and sets strategy', async () => {
    await defraId.plugin.register(server)

    expect(server.register).toHaveBeenCalledWith(bell)
    expect(fetch).toHaveBeenCalledWith(discoveryUrl)

    const [name, scheme, opts] = server.auth.strategy.mock.calls[0]
    expect(name).toBe('defra-id')
    expect(scheme).toBe('bell')
    // location logic
    const fakeRequest = {
      info: { referrer: 'orig' },
      yar: { flash: jest.fn() }
    }
    expect(opts.location(fakeRequest)).toBe(baseUrl + '/auth/callback')
    expect(fakeRequest.yar.flash).toHaveBeenCalledWith('referrer', 'orig')
    // provider config
    const provider = opts.provider
    expect(provider.auth).toBe(fakeOidc.authorization_endpoint)
    expect(provider.token).toBe(fakeOidc.token_endpoint)
    expect(provider.scope).toEqual(['openid', 'offline_access'])
    // credentials mapping
    const creds = { token: 'JWT' }
    const params = { id_token: 'ID-TOK' }
    provider.profile(creds, params)
    expect(jwt.token.decode).toHaveBeenCalledWith('JWT')
    expect(creds.profile).toEqual({
      id: 'user-123',
      correlationId: 'corr-1',
      sessionId: 'sess-1',
      contactId: 'cont-1',
      serviceId: 'svc-1',
      firstName: 'Dimitri',
      lastName: 'Alpha',
      displayName: 'Dimitri Alpha',
      email: 'dimitri@alpha.com',
      uniqueReference: 'u-ref',
      loa: '1',
      aal: '1',
      enrolmentCount: 2,
      enrolmentRequestCount: 1,
      currentRelationshipId: 'rel-1',
      relationships: ['org-1'],
      roles: ['r1'],
      idToken: 'ID-TOK',
      tokenUrl: fakeOidc.token_endpoint,
      logoutUrl: fakeOidc.end_session_endpoint
    })

    expect(opts.password).toBe('cookie-pass')
    expect(opts.clientId).toBe('client-id')
    expect(opts.clientSecret).toBe('secret-val')
    expect(opts.cookie).toBe('bell-defra-id')
    expect(opts.isSecure).toBe(false)
    expect(opts.providerParams).toEqual({ serviceId: 'svc-id' })

    expect(server.ext).toHaveBeenCalledWith('onPostAuth', expect.any(Function))
  })

  it('onPostAuth redirects and sets yar on callback when authenticated', async () => {
    await defraId.plugin.register(server)
    const onPostAuth = server.ext.mock.calls[0][1]

    const fakeProfile = { id: 'u1' }
    const request = {
      path: '/auth/callback',
      auth: { isAuthenticated: true, credentials: { profile: fakeProfile } },
      yar: { set: jest.fn() }
    }
    const h = { redirect: jest.fn(), continue: 'CONT' }

    const result = onPostAuth(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('user', fakeProfile)
    expect(h.redirect).toHaveBeenCalledWith('/')
    expect(result).toBeUndefined()
  })

  it('onPostAuth continues on non-callback or not authenticated', async () => {
    await defraId.plugin.register(server)
    const onPostAuth = server.ext.mock.calls[0][1]

    const request1 = {
      path: '/other',
      auth: { isAuthenticated: true },
      yar: {}
    }
    const h = { redirect: jest.fn(), continue: 'CONT' }
    expect(onPostAuth(request1, h)).toBe('CONT')

    const request2 = {
      path: '/auth/callback',
      auth: { isAuthenticated: false },
      yar: {}
    }
    expect(onPostAuth(request2, h)).toBe('CONT')
  })
})
