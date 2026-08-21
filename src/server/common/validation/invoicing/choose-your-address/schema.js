import joi from 'joi'

export const chooseYourAddressSchema = joi.object({
  selectedAddress: joi.string().required().messages({
    'string.empty': 'SELECTED_ADDRESS_REQUIRED',
    'any.required': 'SELECTED_ADDRESS_REQUIRED'
  })
})
