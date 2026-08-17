import { errorDescriptionByFieldName } from '#src/server/common/helpers/errors.js'
import { invoiceAddressPostcodeSearchErrorMessages } from '#src/server/common/validation/invoicing/constants.js'

export const buildNoAddressesFoundError = () => {
  const errorSummary = [
    {
      href: '#postcode',
      text: invoiceAddressPostcodeSearchErrorMessages.NO_ADDRESSES_FOUND,
      field: 'postcode'
    }
  ]

  return {
    errorSummary,
    errors: errorDescriptionByFieldName(errorSummary)
  }
}
