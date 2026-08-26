import {
  chooseYourAddressController,
  chooseYourAddressSubmitController
} from '#src/server/marine-licence/invoicing/choose-your-address/controller.js'
import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'

export const chooseYourAddressRoutes = [
  {
    method: 'GET',
    path: marineLicenceRoutes.MARINE_LICENCE_CHOOSE_YOUR_ADDRESS,
    ...chooseYourAddressController
  },
  {
    method: 'POST',
    path: marineLicenceRoutes.MARINE_LICENCE_CHOOSE_YOUR_ADDRESS,
    ...chooseYourAddressSubmitController
  }
]
