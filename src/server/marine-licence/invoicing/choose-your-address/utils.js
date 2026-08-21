import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'
import { getInvoiceAddressBackLink } from '#src/server/marine-licence/invoicing/utils.js'

export const NONE_OF_THESE = 'none'

const MINIMUM_RESULTS_FOR_PICKER = 2

export const getSearchResults = (invoicing) =>
  invoicing?.invoiceAddressSearchResults ?? []

export const hasPickableResults = (invoicing) =>
  getSearchResults(invoicing).length >= MINIMUM_RESULTS_FOR_PICKER

export const getChooseYourAddressBackLink = (action) =>
  getInvoiceAddressBackLink(
    action,
    marineLicenceRoutes.MARINE_LICENCE_INVOICE_ADDRESS_POSTCODE_SEARCH
  )

export const buildAddressItems = (results) => [
  ...results.map((result, index) => ({
    value: String(index),
    text: result.addressLine
  })),
  { divider: 'or' },
  { value: NONE_OF_THESE, text: 'None of these' }
]

// Returns the selected result, or null when the value is not an index this
// result set has - a stale or tampered payload rather than a real choice.
export const getSelectedResult = (results, selectedAddress) => {
  if (!/^\d+$/.test(selectedAddress ?? '')) {
    return null
  }

  return results[Number(selectedAddress)] ?? null
}
