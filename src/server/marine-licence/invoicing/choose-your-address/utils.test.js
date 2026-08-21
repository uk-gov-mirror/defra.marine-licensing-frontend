import {
  buildAddressItems,
  getChooseYourAddressBackLink,
  getSearchResults,
  getSelectedResult,
  hasPickableResults
} from '#src/server/marine-licence/invoicing/choose-your-address/utils.js'
import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'

const results = [
  { addressLine: '1 HIGH STREET, LONDON, SW1 2AA' },
  { addressLine: '2 HIGH STREET, LONDON, SW1 2AA' }
]

describe('#chooseYourAddress utils', () => {
  describe('#getSearchResults', () => {
    test.each([
      ['there is no invoicing', undefined],
      ['there are no cached results', {}]
    ])('Should return an empty list when %s', (_name, invoicing) => {
      expect(getSearchResults(invoicing)).toEqual([])
    })

    test('Should return the cached results', () => {
      expect(
        getSearchResults({ invoiceAddressSearchResults: results })
      ).toEqual(results)
    })
  })

  describe('#hasPickableResults', () => {
    test.each([
      ['there are no results', []],
      ['there is a single result', [results[0]]]
    ])('Should be false when %s', (_name, invoiceAddressSearchResults) => {
      expect(hasPickableResults({ invoiceAddressSearchResults })).toBe(false)
    })

    test('Should be true when there is more than one result', () => {
      expect(hasPickableResults({ invoiceAddressSearchResults: results })).toBe(
        true
      )
    })
  })

  describe('#getChooseYourAddressBackLink', () => {
    test('Should go back to the postcode search page', () => {
      expect(getChooseYourAddressBackLink(undefined)).toBe(
        marineLicenceRoutes.MARINE_LICENCE_INVOICE_ADDRESS_POSTCODE_SEARCH
      )
    })

    test('Should go back to check answers in the change flow', () => {
      expect(getChooseYourAddressBackLink('change')).toBe(
        marineLicenceRoutes.MARINE_LICENCE_CHECK_INVOICING_DETAILS
      )
    })
  })

  describe('#buildAddressItems', () => {
    test('Should list the addresses in response order, then an "or" divider and "None of these"', () => {
      expect(buildAddressItems(results)).toEqual([
        { value: '0', text: '1 HIGH STREET, LONDON, SW1 2AA' },
        { value: '1', text: '2 HIGH STREET, LONDON, SW1 2AA' },
        { divider: 'or' },
        { value: 'none', text: 'None of these' }
      ])
    })
  })

  describe('#getSelectedResult', () => {
    test('Should return the result at the selected index', () => {
      expect(getSelectedResult(results, '1')).toBe(results[1])
    })

    test.each([
      ['the index is out of range', '2'],
      ['the value is not an index', 'none'],
      ['the value is negative', '-1'],
      ['the value is missing', undefined]
    ])('Should return null when %s', (_name, selectedAddress) => {
      expect(getSelectedResult(results, selectedAddress)).toBeNull()
    })
  })
})
