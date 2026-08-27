import { FilterToggleButton } from '@ministryofjustice/frontend'

export class MojFilter {
  constructor() {
    this.$root = document.querySelector('[data-module="moj-filter"]')

    if (!(this.$root instanceof HTMLDivElement)) {
      return
    }

    this.filterToggleButton = new FilterToggleButton(this.$root, {
      bigModeMediaQuery: '(min-width: 48.0625em)',
      startHidden: true,
      toggleButton: {
        showText: 'Show filter',
        hideText: 'Hide filter',
        classes: 'govuk-button--secondary'
      },
      closeButton: {
        text: 'Close'
      }
    })
  }
  static moduleName = 'moj-filter'
}
