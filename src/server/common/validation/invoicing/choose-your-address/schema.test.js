import { chooseYourAddressSchema } from '#src/server/common/validation/invoicing/choose-your-address/schema.js'

describe('chooseYourAddressSchema', () => {
  test.each([
    ['nothing is selected', {}],
    ['the selection is empty', { selectedAddress: '' }]
  ])('Should require a selection when %s', (_name, payload) => {
    const { error } = chooseYourAddressSchema.validate(payload)

    expect(error.details[0].message).toBe('SELECTED_ADDRESS_REQUIRED')
    expect(error.details[0].path).toEqual(['selectedAddress'])
  })

  test.each([['0'], ['3'], ['none']])(
    'Should accept the selection %s',
    (selectedAddress) => {
      const { error } = chooseYourAddressSchema.validate({ selectedAddress })

      expect(error).toBeUndefined()
    }
  )
})
