import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

import { AddAnotherPolygon } from './add-another-polygon/index.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

document.addEventListener('DOMContentLoaded', () => {
  const addAnotherElements = document.querySelectorAll(
    '[data-module="polygon-add-another"]'
  )
  addAnotherElements.forEach((element) => {
    // eslint-disable-next-line no-new
    new AddAnotherPolygon(element)
  })
})
