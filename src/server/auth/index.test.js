import { auth } from './index.js'
import { authCallbackController } from './controller.js'

describe('auth plugin', () => {
  let server

  beforeEach(() => {
    server = {
      route: jest.fn()
    }
  })

  it('registers GET and POST /auth/callback using authCallbackController', () => {
    auth.plugin.register(server)

    expect(server.route).toHaveBeenCalledTimes(1)

    const route = server.route.mock.calls[0][0]

    expect(route.method).toEqual(['GET', 'POST'])
    expect(route.path).toBe('/auth/callback')

    expect(route.options).toBe(authCallbackController.options)
    expect(route.handler).toBe(authCallbackController.handler)
  })
})
