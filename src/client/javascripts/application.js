import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

import { AddAnotherPoint } from './add-another-point/index.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

document.addEventListener('DOMContentLoaded', () => {
  const addAnotherElements = document.querySelectorAll(
    '[data-module="add-another-point"]'
  )
  addAnotherElements.forEach((element) => {
    // eslint-disable-next-line no-new
    new AddAnotherPoint(element)
  })
})
