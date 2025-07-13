import { Component } from 'govuk-frontend'

const REMOVE_BUTTON_CLASS = 'add-another-point__remove-button'

export class AddAnotherPoint extends Component {
  constructor($root) {
    super($root)

    this.minItems = parseInt($root.getAttribute('data-min-items') ?? '1', 10)
    this.$root.addEventListener('click', this.onRemoveButtonClick.bind(this))
    this.$root.addEventListener('click', this.onAddButtonClick.bind(this))
    this.initializeItems()
  }

  initializeItems() {
    const $items = this.getItems()

    while ($items.length < this.minItems) {
      const $newItem = this.getNewItem()
      if ($newItem) {
        this.updateAttributes($newItem, $items.length)
        this.resetItem($newItem)

        const $lastItem = $items[$items.length - 1] || $items[0]
        if ($lastItem) {
          $lastItem.after($newItem)
          $items.push($newItem)
        }
      }
    }

    this.updateRemoveButtonsVisibility()
    this.getItems().forEach(($item, index) => {
      this.updateAttributes($item, index)
    })
  }

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

    const $input = $newItem.querySelector('input, textarea, select')
    if ($input && $input instanceof HTMLInputElement) {
      $input.focus()
    }
  }

  updateRemoveButtonsVisibility() {
    const $items = this.getItems()
    const totalItems = $items.length

    $items.forEach(($item, index) => {
      let $removeButton = $item.querySelector(`.${REMOVE_BUTTON_CLASS}`) // Use class directly for querySelector

      const shouldShowRemoveButton =
        totalItems > this.minItems && index >= this.minItems

      if (shouldShowRemoveButton) {
        if (!$removeButton) {
          $removeButton = this.createRemoveButton($item)
        }
      }

      if ($removeButton) {
        $removeButton.style.display = shouldShowRemoveButton ? '' : 'none'
      }
    })
  }

  getItems() {
    if (!this.$root) {
      return []
    }

    const $items = Array.from(
      this.$root.querySelectorAll('.add-another-point__item')
    )

    return $items.filter((item) => item instanceof HTMLElement)
  }

  getNewItem() {
    const $items = this.getItems()
    const $item = $items[0].cloneNode(true)

    if (!$item || !($item instanceof HTMLElement)) {
      return
    }

    const $existingRemoveButton = $item.querySelector(REMOVE_BUTTON_CLASS)
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

      const name = $input.getAttribute('data-name') ?? ''
      const id = $input.getAttribute('data-id') ?? ''
      const originalId = $input.id

      $input.name = name.replace(/%index%/, `${index}`)
      $input.id = id.replace(/%index%/, `${index}`)

      const $label =
        $input.parentElement?.querySelector(`label[for="${originalId}"]`) ??
        $input.closest('label') ??
        $item.querySelector(`label[for="${originalId}"]`)

      if ($label && $label instanceof HTMLLabelElement) {
        $label.htmlFor = $input.id

        let labelTextPrefix = ''
        const dataName = $input.getAttribute('data-name')
        if (dataName) {
          const match = dataName.match(
            /\[(eastings|northings|latitude|longitude)\]/i
          )
          if (match?.[1]) {
            const fieldName = match[1]
            labelTextPrefix =
              fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
          }
        }

        if (index === 0) {
          $label.textContent = `${labelTextPrefix} of start and end point`
        } else {
          $label.textContent = `${labelTextPrefix} of point ${index + 1}`
        }
      }
    })

    const $legend = $item.querySelector('.govuk-fieldset__legend--s')
    if ($legend && $legend instanceof HTMLElement) {
      if (index === 0) {
        $legend.textContent = 'Start and end point'
      } else {
        $legend.textContent = `Point ${index + 1}`
      }
    }
  }

  createRemoveButton($item) {
    if ($item.querySelector(`.${REMOVE_BUTTON_CLASS}`)) {
      return $item.querySelector(`.${REMOVE_BUTTON_CLASS}`)
    }

    const $button = document.createElement('button')
    $button.type = 'button'
    $button.classList.add(
      'govuk-button',
      'govuk-button--secondary',
      REMOVE_BUTTON_CLASS
    )
    $button.textContent = 'Remove'

    const $fieldset = $item.querySelector('.govuk-fieldset')

    if ($fieldset) {
      const $legend = $fieldset.querySelector('.govuk-fieldset__legend')
      if ($legend) {
        $legend.after($button)
      } else {
        $fieldset.append($button)
      }
    } else {
      $item.append($button)
    }
    return $button
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

  static moduleName = 'add-another-point'
}
