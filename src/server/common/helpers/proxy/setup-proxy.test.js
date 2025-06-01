import { config } from '~/src/config/config.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

// Mock the undici functions
jest.mock('undici')

describe('setupProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    config.set('httpProxy', null)
  })

  test('Should not setup proxy if the environment variable is not set', () => {
    config.set('httpProxy', null)
    setupProxy()

    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBeUndefined()
    expect(setGlobalDispatcher).not.toHaveBeenCalled()
  })

  test('Should setup proxy if the environment variable is set', () => {
    config.set('httpProxy', 'http://localhost:8080')
    setupProxy()

    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBe('http://localhost:8080')
    expect(ProxyAgent).toHaveBeenCalledWith('http://localhost:8080')
    expect(setGlobalDispatcher).toHaveBeenCalled()
  })
})
