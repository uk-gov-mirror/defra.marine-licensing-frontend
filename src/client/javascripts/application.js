import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

import { AddAnother } from './add-another.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

document.addEventListener('DOMContentLoaded', () => {
  const addAnotherElements = document.querySelectorAll(
    '[data-module="moj-add-another"]'
  )
  addAnotherElements.forEach((element) => {
    // eslint-disable-next-line no-new
    new AddAnother(element)
  })
})
