import fetch from 'node-fetch'
import jwt from '@hapi/jwt'
import bell from '@hapi/bell'
import cookiePlugin from '@hapi/cookie'

import { config } from '~/src/config/config.js'
import { defraId } from './defra-id.js'
import { refreshTokens } from './refresh-tokens.js'

jest.mock('node-fetch')
jest.mock('./refresh-tokens.js')

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
          'session.cookie.password': 'cookie-pass',
          defraIdRefreshTokens: true
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
    jwt.token.verifyTime = jest.fn()

    server = {
      register: jest.fn().mockResolvedValue(),
      auth: {
        strategy: jest.fn(),
        default: jest.fn()
      },
      ext: jest.fn(),
      app: {
        cache: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    }
  })

  it('registers Bell + cookie, fetches discovery, sets bell & session strategies, and defaults to session', async () => {
    await defraId.plugin.register(server)

    expect(server.register).toHaveBeenCalledWith(bell)
    expect(server.register).toHaveBeenCalledWith(cookiePlugin)
    expect(fetch).toHaveBeenCalledWith(discoveryUrl)

    const bellCall = server.auth.strategy.mock.calls.find(
      (c) => c[0] === 'defra-id'
    )
    const [name, scheme, opts] = bellCall
    expect(name).toBe('defra-id')
    expect(scheme).toBe('bell')

    const fakeRequest = {
      info: { referrer: 'orig' },
      yar: { flash: jest.fn() }
    }
    expect(opts.location(fakeRequest)).toBe(baseUrl + '/auth/callback')
    expect(fakeRequest.yar.flash).toHaveBeenCalledWith('referrer', 'orig')

    const provider = opts.provider
    expect(provider.auth).toBe(fakeOidc.authorization_endpoint)
    expect(provider.token).toBe(fakeOidc.token_endpoint)
    expect(provider.scope).toEqual(['openid', 'offline_access'])

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

    const sessionCall = server.auth.strategy.mock.calls.find(
      (c) => c[0] === 'session'
    )
    expect(sessionCall).toBeDefined()
    expect(sessionCall[1]).toBe('cookie')
    const sessionOpts = sessionCall[2]
    expect(sessionOpts).toEqual(
      expect.objectContaining({
        cookie: expect.objectContaining({
          name: 'sess-defra-id',
          password: 'cookie-pass',
          isSecure: false,
          path: '/'
        }),
        redirectTo: false,
        validate: expect.any(Function)
      })
    )

    expect(server.auth.default).toHaveBeenCalledWith('session')
  })

  it('onPostAuth redirects + sets yar only on /auth/callback when authenticated', async () => {
    await defraId.plugin.register(server)
    const onPostAuth = server.ext.mock.calls.find(
      (c) => c[0] === 'onPostAuth'
    )[1]

    const fakeProfile = { foo: 'bar' }
    const request = {
      path: '/auth/callback',
      auth: { isAuthenticated: true, credentials: { profile: fakeProfile } },
      yar: { set: jest.fn() }
    }
    const h = { redirect: jest.fn(), continue: 'CONT' }
    expect(onPostAuth(request, h)).toBeUndefined()
    expect(request.yar.set).toHaveBeenCalledWith('user', fakeProfile)
    expect(h.redirect).toHaveBeenCalledWith('/')

    expect(
      onPostAuth({ path: '/x', auth: { isAuthenticated: true }, yar: {} }, h)
    ).toBe('CONT')
    expect(
      onPostAuth(
        { path: '/auth/callback', auth: { isAuthenticated: false }, yar: {} },
        h
      )
    ).toBe('CONT')
  })

  describe('session.validate', () => {
    let validate
    const session = { sessionId: 'S1' }

    beforeEach(async () => {
      await defraId.plugin.register(server)
      validate = server.auth.strategy.mock.calls.find(
        (c) => c[0] === 'session'
      )[2].validate
    })

    it('returns isValid=false when no cache entry', async () => {
      server.app.cache.get.mockResolvedValueOnce(null)
      expect(await validate({ server }, session)).toEqual({ isValid: false })
    })

    it('returns isValid=true when token not expired', async () => {
      const data = { accessToken: 'A', refreshToken: 'R' }
      server.app.cache.get.mockResolvedValueOnce(data)
      jwt.token.verifyTime.mockImplementation(() => false)
      const out = await validate({ server }, session)
      expect(jwt.token.verifyTime).toHaveBeenCalled()
      expect(out).toEqual({ isValid: true, credentials: data })
    })

    it('returns isValid=false when expired and refresh disabled', async () => {
      // disable refresh
      config.get.mockReturnValueOnce(false)
      server.app.cache.get.mockResolvedValueOnce({
        accessToken: 'A',
        refreshToken: 'R'
      })
      jwt.token.verifyTime.mockImplementation(() => {
        throw new Error('expired')
      })
      expect(await validate({ server }, session)).toEqual({ isValid: false })
    })

    it('refreshes and returns isValid=true when expired+refresh enabled', async () => {
      const original = { accessToken: 'A', refreshToken: 'R' }
      server.app.cache.get.mockResolvedValueOnce(original)
      jwt.token.verifyTime.mockImplementation(() => {
        throw new Error('expired')
      })

      refreshTokens.mockResolvedValueOnce({
        access_token: 'A2',
        refresh_token: 'R2',
        expires_in: 999
      })

      const result = await validate({ server }, session)

      expect(refreshTokens).toHaveBeenCalledWith('R')
      expect(server.app.cache.set).toHaveBeenCalledWith('S1', {
        accessToken: 'A2',
        refreshToken: 'R2',
        expiresIn: 999
      })

      expect(result).toEqual({
        isValid: true,
        credentials: {
          accessToken: 'A2',
          refreshToken: 'R2',
          expiresIn: 999
        }
      })
    })
  })
})
