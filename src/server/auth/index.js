import { authCallbackController } from './controller.js'

export const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.route({
        method: ['GET', 'POST'],
        path: '/auth/callback',
        ...authCallbackController
      })
    }
  }
}
