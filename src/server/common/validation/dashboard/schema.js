import joi from 'joi'

export const dashboardFilterSchema = joi.object({
  show: joi.string().valid('all-projects', 'my-projects')
})
