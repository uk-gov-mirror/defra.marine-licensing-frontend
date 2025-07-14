import { Component } from 'govuk-frontend'

const REMOVE_BUTTON_CLASS = 'add-another-point__remove-button'

export class AddAnotherPoint extends Component {
  constructor($root) {
    super($root)

    this.minItems = parseInt($root.getAttribute('data-min-items') ?? '1', 10)
    this.$root.addEventListener('click', this.onRemoveButtonClick.bind(this))
    this.$root.addEventListener('click', this.onAddButtonClick.bind(this))
  }

  static moduleName = 'add-another-point'

  onAddButtonClick(event) {
    const $button = event.target

    if (
      !$button ||
      !($button instanceof HTMLButtonElement) ||
      !$button.classList.contains('add-another-point__add-button')
    ) {
      return
    }

    const $items = this.getItems()
    const $newItem = this.getNewItem()

    if (!$newItem || !($newItem instanceof HTMLElement)) {
      return
    }

    this.updateAttributes($newItem, $items.length)
    this.resetItem($newItem)

    $items[$items.length - 1].after($newItem)

    this.updateRemoveButtonsVisibility()
    this.getItems().forEach(($item, index) => {
      this.updateAttributes($item, index)
    })

    const $input = $newItem.querySelector('input')
    if ($input && $input instanceof HTMLInputElement) {
      $input.focus()
    }
  }

  updateRemoveButtonsVisibility() {
    const $items = this.getItems()
    $items.forEach(($item, index) => {
      const $removeButton = $item.querySelector(`.${REMOVE_BUTTON_CLASS}`)
      if (index >= this.minItems && !$removeButton) {
        this.createRemoveButton($item)
      } else if (index < this.minItems && $removeButton) {
        $removeButton.remove()
      }
    })
  }

  getItems() {
    if (!this.$root) {
      return []
    }
    return Array.from(
      this.$root.querySelectorAll('.add-another-point__item')
    ).filter((item) => item instanceof HTMLElement)
  }

  getNewItem() {
    const $items = this.getItems()
    if (!$items[0]) {
      return null
    }
    const $item = $items[0].cloneNode(true)
    const $existingRemoveButton = $item.querySelector(`.${REMOVE_BUTTON_CLASS}`)
    if ($existingRemoveButton) {
      $existingRemoveButton.remove()
    }
    return $item
  }

  updateAttributes($item, index) {
    $item.querySelectorAll('[data-name]').forEach(($input) => {
      if (!this.isValidInputElement($input)) {
        return
      }

      const rawDataName = $input.getAttribute('data-name') ?? ''
      const rawDataId = $input.getAttribute('data-id') ?? ''
      const originalId = $input.id

      $input.name = rawDataName.replace(/%index%/, `${index}`)
      $input.id = rawDataId.replace(/%index%/, `${index}`)

      const $label =
        $input.parentElement?.querySelector(`label[for="${originalId}"]`) ??
        $input.closest('label') ??
        $item.querySelector(`label[for="${originalId}"]`)

      if ($label instanceof HTMLLabelElement) {
        $label.htmlFor = $input.id

        const processedDataName = rawDataName.replace(/%index%/, `${index}`)

        const lastBracketIndex = processedDataName.lastIndexOf('[')
        const fieldName =
          lastBracketIndex !== -1 && processedDataName.endsWith(']')
            ? processedDataName
                .slice(lastBracketIndex + 1, -1)
                .charAt(0)
                .toUpperCase() +
              processedDataName.slice(lastBracketIndex + 1, -1).slice(1)
            : ''

        if (index === 0) {
          $label.textContent = `${fieldName} of start and end point`
        } else {
          $label.textContent = `${fieldName} of point ${index + 1}`
        }
      }
    })

    const $legend = $item.querySelector('.govuk-fieldset__legend--s')
    if ($legend instanceof HTMLElement) {
      if (index === 0) {
        $legend.textContent = 'Start and end point'
      } else {
        $legend.textContent = `Point ${index + 1}`
      }
    }
  }

  createRemoveButton($item) {
    const $button = document.createElement('button')
    $button.type = 'button'
    $button.classList.add(
      'govuk-button',
      'govuk-button--secondary',
      REMOVE_BUTTON_CLASS
    )
    $button.textContent = 'Remove'

    const $fieldset = $item.querySelector('.govuk-fieldset')
    const $legend = $fieldset.querySelector('.govuk-fieldset__legend')
    $legend.after($button)
  }

  resetItem($item) {
    $item.querySelectorAll('[data-name], [data-id]').forEach(($input) => {
      if (!this.isValidInputElement($input)) {
        return
      }
      if (
        ($input instanceof HTMLInputElement && $input.type === 'text') ||
        $input instanceof HTMLTextAreaElement
      ) {
        $input.value = ''
      }
    })
  }

  onRemoveButtonClick(event) {
    event.preventDefault()
    event.stopPropagation()

    const $button = event.target

    if (
      !$button ||
      !($button instanceof HTMLButtonElement) ||
      !$button.classList.contains('add-another-point__remove-button')
    ) {
      return
    }

    const $items = this.getItems()

    if ($items.length <= this.minItems) {
      return
    }

    $button.closest('.add-another-point__item').remove()

    this.getItems().forEach(($item, index) => {
      this.updateAttributes($item, index)
    })

    this.updateRemoveButtonsVisibility()
  }

  isValidInputElement($input) {
    return (
      ($input instanceof HTMLInputElement && $input.type === 'text') ||
      $input instanceof HTMLTextAreaElement
    )
  }
}
