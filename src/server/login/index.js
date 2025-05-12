export const login = {
  plugin: {
    name: 'login',
    register: (server) => {
      server.route({
        method: 'GET',
        path: '/login',
        options: {
          auth: 'defra-id'
        },
        handler: () => {
          return ''
        }
      })
    }
  }
}
