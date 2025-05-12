import { login } from './index.js'

describe('login plugin', () => {
  it('registers GET /login with auth defra-id and empty handler', () => {
    const server = { route: jest.fn() }

    login.plugin.register(server)

    expect(server.route).toHaveBeenCalledTimes(1)
    const route = server.route.mock.calls[0][0]

    expect(route.method).toBe('GET')
    expect(route.path).toBe('/login')
    expect(route.options).toEqual({ auth: 'defra-id' })

    expect(typeof route.handler).toBe('function')
    expect(route.handler()).toBe('')
  })
})
