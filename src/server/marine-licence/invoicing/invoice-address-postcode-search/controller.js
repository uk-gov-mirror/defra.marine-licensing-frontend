import {
  getMarineLicenceCache,
  setMarineLicenceCache
} from '#src/server/common/helpers/marine-licence/session-cache/utils.js'
import { createFailAction } from '#src/server/common/helpers/createFailAction.js'
import { invoiceAddressPostcodeSearchSchema } from '#src/server/common/validation/invoicing/invoice-address-postcode-search/schema.js'
import {
  INVOICE_TYPE_OPTIONS,
  invoiceAddressPostcodeSearchErrorMessages,
  invoiceAddressPostcodeSearchSettings
} from '#src/server/common/validation/invoicing/constants.js'
import { marineLicenceRoutes } from '#src/server/common/constants/routes.js'
import {
  getInvoiceAddressBackLink,
  getInvoiceCancelLink,
  getInvoiceAddressButtonText
} from '#src/server/marine-licence/invoicing/utils.js'
import { lookupAddresses } from '#src/server/common/helpers/marine-licence/invoicing/address-lookup.js'
import { buildNoAddressesFoundError } from '#src/server/marine-licence/invoicing/invoice-address-postcode-search/utils.js'

export const INVOICE_ADDRESS_POSTCODE_SEARCH_VIEW_ROUTE =
  'marine-licence/invoicing/invoice-address-postcode-search/index'

const getPageParams = (action, invoicing) => ({
  ...invoiceAddressPostcodeSearchSettings,
  backLink: getInvoiceAddressBackLink(action),
  cancelLink: getInvoiceCancelLink(action, invoicing),
  buttonText: getInvoiceAddressButtonText(action, invoicing),
  manualEntryLink: marineLicenceRoutes.MARINE_LICENCE_UK_INVOICE_ADDRESS
})

export const invoiceAddressPostcodeSearchController = {
  async handler(request, h) {
    const marineLicence = getMarineLicenceCache(request)
    const { invoicing } = marineLicence

    if (invoicing.invoiceAddressType !== INVOICE_TYPE_OPTIONS.UK) {
      return h.redirect(
        marineLicenceRoutes.MARINE_LICENCE_IS_INVOICE_ADDRESS_UK_OR_INTERNATIONAL
      )
    }

    const action = request.query.action

    return h.view(INVOICE_ADDRESS_POSTCODE_SEARCH_VIEW_ROUTE, {
      ...getPageParams(action, invoicing),
      projectName: marineLicence.projectName,
      payload: invoicing.invoiceAddressSearch ?? {}
    })
  }
}

export const invoiceAddressPostcodeSearchSubmitController = {
  options: {
    validate: {
      payload: invoiceAddressPostcodeSearchSchema,
      failAction: (request, h, err) => {
        const { projectName, invoicing } = getMarineLicenceCache(request)
        const action = request.query.action
        const { backLink, ...params } = getPageParams(action, invoicing)

        return createFailAction({
          viewRoute: INVOICE_ADDRESS_POSTCODE_SEARCH_VIEW_ROUTE,
          settings: invoiceAddressPostcodeSearchSettings,
          errorMessages: invoiceAddressPostcodeSearchErrorMessages,
          projectName,
          backLink,
          payload: request.payload,
          params
        })(request, h, err)
      }
    }
  },
  async handler(request, h) {
    const { payload } = request
    const marineLicence = getMarineLicenceCache(request)
    const { invoicing } = marineLicence
    const action = request.query.action

    const invoiceAddressSearch = {
      postcode: payload.postcode,
      propertyNameOrNumber: payload.propertyNameOrNumber
    }

    const { results } = await lookupAddresses(request, invoiceAddressSearch)

    // TEMP DEBUG - remove before merge
    request.logger.info(
      {
        invoiceAddressSearch,
        resultCount: results.length,
        results
      },
      'TEMP DEBUG address lookup results'
    )

    await setMarineLicenceCache(request, h, {
      ...marineLicence,
      invoicing: {
        ...invoicing,
        invoiceAddressSearch,
        invoiceAddressSearchResults: results
      }
    })

    return h.view(INVOICE_ADDRESS_POSTCODE_SEARCH_VIEW_ROUTE, {
      ...getPageParams(action, invoicing),
      projectName: marineLicence.projectName,
      payload: invoiceAddressSearch,
      ...(results.length === 0 ? buildNoAddressesFoundError() : {})
    })
  }
}
