import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'
import { siteNoticeQrCodeController } from '#src/server/marine-licence/site-notice/qr-code/controller.js'

export const siteNoticeQrCodeRoutes = [
  {
    method: 'GET',
    path: marineLicenceRoutes.MARINE_LICENCE_SITE_NOTICE_QR_CODE,
    options: {
      auth: false
    },
    ...siteNoticeQrCodeController
  }
]
