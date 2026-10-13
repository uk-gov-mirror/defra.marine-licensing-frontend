import QRCode from 'qrcode'
import { config } from '#src/config/config.js'
import {
  createQrCodeSvg,
  getPublicViewDetailsAbsoluteUrl,
  getSiteNoticeQrCode,
  SITE_NOTICE_QR_CODE_DEFAULT_SIZE
} from '#src/server/common/helpers/marine-licence/site-notice-qr-code.js'

const marineLicenceId = '6a7c4c11726ee5b252f27321'
const cdpTestBaseUrl =
  'https://marine-licensing-frontend.test.cdp-int.defra.cloud'
const cdpTestPublicUrl = `${cdpTestBaseUrl}/marine-licence/view-public-details/${marineLicenceId}`

describe('#getPublicViewDetailsAbsoluteUrl', () => {
  test('builds the public view details URL from the base URL', () => {
    expect(
      getPublicViewDetailsAbsoluteUrl(marineLicenceId, cdpTestBaseUrl)
    ).toBe(cdpTestPublicUrl)
  })

  test('ignores trailing slashes on the base URL', () => {
    expect(
      getPublicViewDetailsAbsoluteUrl(marineLicenceId, `${cdpTestBaseUrl}//`)
    ).toBe(cdpTestPublicUrl)
  })

  test('keeps a path prefix on the base URL', () => {
    expect(
      getPublicViewDetailsAbsoluteUrl(
        marineLicenceId,
        'https://example.gov.uk/apply/'
      )
    ).toBe(
      `https://example.gov.uk/apply/marine-licence/view-public-details/${marineLicenceId}`
    )
  })

  test('URL-encodes the id', () => {
    expect(
      getPublicViewDetailsAbsoluteUrl('../../admin?x#y', cdpTestBaseUrl)
    ).toBe(
      `${cdpTestBaseUrl}/marine-licence/view-public-details/..%2F..%2Fadmin%3Fx%23y`
    )
  })

  test('uses appBaseUrl from config by default', () => {
    expect(getPublicViewDetailsAbsoluteUrl(marineLicenceId)).toBe(
      `${config.get('appBaseUrl')}/marine-licence/view-public-details/${marineLicenceId}`
    )
  })

  test('throws when the base URL has no scheme', () => {
    expect(() =>
      getPublicViewDetailsAbsoluteUrl(
        marineLicenceId,
        'marine-licensing-frontend.test.cdp-int.defra.cloud'
      )
    ).toThrow(TypeError)
  })
})

describe('#createQrCodeSvg', () => {
  test('returns an SVG at the requested size', async () => {
    const svg = await createQrCodeSvg(cdpTestPublicUrl, 120)

    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('width="120" height="120"')
    expect(svg).toContain('viewBox=')
  })

  test('uses the default size when none is given', async () => {
    const svg = await createQrCodeSvg(cdpTestPublicUrl)

    expect(svg).toContain(
      `width="${SITE_NOTICE_QR_CODE_DEFAULT_SIZE}" height="${SITE_NOTICE_QR_CODE_DEFAULT_SIZE}"`
    )
  })

  test('uses error correction level Q with a 4 module quiet zone', async () => {
    const svg = await createQrCodeSvg(cdpTestPublicUrl)
    const { modules } = QRCode.create(cdpTestPublicUrl, {
      errorCorrectionLevel: 'Q'
    })
    const viewBoxSize = modules.size + 8

    expect(svg).toContain(`viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"`)
  })

  test('does not use inline style attributes', async () => {
    const svg = await createQrCodeSvg(cdpTestPublicUrl)

    expect(svg).not.toMatch(/\sstyle=/)
    expect(svg).not.toContain('<style')
  })
})

describe('#getSiteNoticeQrCode', () => {
  test('returns the encoded URL and its SVG', async () => {
    const qrCode = await getSiteNoticeQrCode(marineLicenceId, {
      baseUrl: cdpTestBaseUrl,
      size: 300
    })

    expect(qrCode.url).toBe(cdpTestPublicUrl)
    expect(qrCode.svg).toContain('width="300" height="300"')
  })
})
