import { chooseYourAddressRoutes } from '#src/server/marine-licence/invoicing/choose-your-address/index.js'
import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'

describe('chooseYourAddressRoutes routes', () => {
  test('get route is formatted correctly', () => {
    expect(chooseYourAddressRoutes[0]).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: marineLicenceRoutes.MARINE_LICENCE_CHOOSE_YOUR_ADDRESS
      })
    )
  })

  test('post route is formatted correctly', () => {
    expect(chooseYourAddressRoutes[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: marineLicenceRoutes.MARINE_LICENCE_CHOOSE_YOUR_ADDRESS
      })
    )
  })
})
