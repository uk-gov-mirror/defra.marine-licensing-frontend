import { renderComponentJSDOM } from '#src/server/test-helpers/component-helpers.js'
import { within } from '@testing-library/dom'

describe('appOrganisationHeading Component', () => {
  let $component

  test('Should render application organisation name', () => {
    $component = renderComponentJSDOM('organisation-heading', {
      applicantOrganisationName: 'Test Org'
    })

    expect(within($component).getByText('Test Org')).toBeInTheDocument()
  })

  test('should not render the organisation name if it is not provided', () => {
    $component = renderComponentJSDOM('organisation-heading', {
      applicantOrganisationName: undefined
    })

    expect(within($component).queryByText('Test Org')).not.toBeInTheDocument()
  })

  test('should show a Change organisation link if the user has multiple organisations', () => {
    $component = renderComponentJSDOM('organisation-heading', {
      applicantOrganisationName: 'Test Org',
      hasMultipleOrganisations: true
    })
    expect(
      within($component).getByRole('link', { name: 'Change organisation' })
    ).toBeInTheDocument()
  })

  test('should not show a Change organisation link if the user has multiple organisations', () => {
    $component = renderComponentJSDOM('organisation-heading', {
      applicantOrganisationName: 'Test Org',
      hasMultipleOrganisations: false
    })
    expect(
      within($component).queryByRole('link', { name: 'Change organisation' })
    ).not.toBeInTheDocument()
  })
})
