import { getUserSession } from '~/src/server/common/plugins/auth/utils.js'
import { config } from '~/src/config/config.js'

/**
 * @param {Partial<Request> | null} request
 */
export const buildNavigation = async (request) => {
  const { accountManagementUrl } = config.get('defraId')
  const authedUser = await getUserSession(request)

  const navigation = [
    {
      text: 'Home',
      url: '/',
      isActive: request?.path === '/'
    }
  ]

  if (authedUser?.strategy === 'defraId') {
    navigation.push({
      text: 'Manage account',
      url: accountManagementUrl
    })
  }

  return navigation
}

/**
 * @import { Request } from '@hapi/hapi'
 */
