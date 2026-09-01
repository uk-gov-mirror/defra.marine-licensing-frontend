import { dashboardFilterSchema } from '#src/server/common/validation/dashboard/schema.js'

describe('#dashboardFilterSchema', () => {
  test('should validate an empty payload', () => {
    const { error } = dashboardFilterSchema.validate({})

    expect(error).toBeUndefined()
  })

  test('should validate a valid show value', () => {
    const { error } = dashboardFilterSchema.validate({ show: 'my-projects' })

    expect(error).toBeUndefined()
  })

  test('should fail on an invalid show value', () => {
    const { error } = dashboardFilterSchema.validate({ show: 'not-a-value' })

    expect(error).toBeDefined()
  })

  test('should fail on an unknown field', () => {
    const { error } = dashboardFilterSchema.validate({ notAField: 'value' })

    expect(error).toBeDefined()
  })
})
