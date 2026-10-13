import { siteNoticeQrCodeRoutes } from '#src/server/marine-licence/site-notice/qr-code/index.js'

describe('site notice QR code route', () => {
  test('route is registered as a public GET route', () => {
    expect(siteNoticeQrCodeRoutes).toEqual([
      expect.objectContaining({
        method: 'GET',
        path: '/marine-licence/site-notice/qr-code',
        options: {
          auth: false
        }
      })
    ])
  })
})
