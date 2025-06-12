import { loginController } from '~/src/server/auth/login.js'
import { signInOidcController } from '~/src/server/auth/sign-in-oidc.js'

export const auth = {
  plugin: {
    name: 'auth_routes',
    register(server) {
      server.route([signInOidcController, loginController])
    }
  }
}
