import { selfServiceRoutes } from '#src/server/self-service/routes.js'

export const selfService = {
  plugin: {
    name: 'self-service',
    register(server) {
      server.route(selfServiceRoutes)
    }
  }
}
