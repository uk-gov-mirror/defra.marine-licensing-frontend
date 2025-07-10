import { Component } from 'govuk-frontend'

export class AddAnother extends Component {
  /**
   * @param {Element | null} $root - HTML element to use for add another
   */
  constructor($root) {
    super($root)

    this.minItems = parseInt($root.getAttribute('data-min-items') ?? '1', 10)
    this.fieldNames = ($root.getAttribute('data-field-names') ?? '')
      .split(',')
      .map((name) => name.trim().toLowerCase())

    this.$root.addEventListener('click', this.onRemoveButtonClick.bind(this))
    this.$root.addEventListener('click', this.onAddButtonClick.bind(this))

    const $buttons = this.$root.querySelectorAll(
      '.moj-add-another__add-button, .moj-add-another__remove-button'
    )

    $buttons.forEach(($button) => {
      if (!($button instanceof HTMLButtonElement)) {
        return
      }
      $button.type = 'button'
    })

    this.initializeItems()
  }

  /**
   * Initialize items to meet minimum requirements and apply JS control
   */
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

  /**
   * @param {MouseEvent} event - Click event
   */
  onAddButtonClick(event) {
    const $button = event.target

    if (
      !$button ||
      !($button instanceof HTMLButtonElement) ||
      !$button.classList.contains('moj-add-another__add-button')
    ) {
      return
    }

    const $items = this.getItems()
    const $item = this.getNewItem()

    if (!$item || !($item instanceof HTMLElement)) {
      return
    }

    this.updateAttributes($item, $items.length)
    this.resetItem($item)

    $items[$items.length - 1].after($item)

    this.updateRemoveButtonsVisibility()
    this.getItems().forEach(($item, index) => {
      this.updateAttributes($item, index)
    })

    const $input = $item.querySelector('input, textarea, select')
    if ($input && $input instanceof HTMLInputElement) {
      $input.focus()
    }
  }

  /**
   * Update visibility of remove buttons based on minimum items
   */
  updateRemoveButtonsVisibility() {
    const $items = this.getItems()
    const totalItems = $items.length

    $items.forEach(($item, index) => {
      let $removeButton = $item.querySelector('.moj-add-another__remove-button')

      const canBeRemoved = totalItems > this.minItems && index >= this.minItems

      if (canBeRemoved) {
        if (!$removeButton) {
          this.createRemoveButton($item)
          $removeButton = $item.querySelector('.moj-add-another__remove-button')
        }
        if ($removeButton) {
          $removeButton.style.display = ''
        }
      } else {
        if ($removeButton) {
          $removeButton.style.display = 'none'
        }
      }
    })
  }

  getItems() {
    if (!this.$root) {
      return []
    }

    const $items = Array.from(
      this.$root.querySelectorAll('.moj-add-another__item')
    )

    return $items.filter((item) => item instanceof HTMLElement)
  }

  getNewItem() {
    const $items = this.getItems()
    const $item = $items[0].cloneNode(true)

    if (!$item || !($item instanceof HTMLElement)) {
      return
    }

    const $existingRemoveButton = $item.querySelector(
      '.moj-add-another__remove-button'
    )
    if ($existingRemoveButton) {
      $existingRemoveButton.remove()
    }

    return $item
  }

  /**
   * @param {HTMLElement} $item - Add another item
   * @param {number} index - Add another item index
   */
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

  /**
   * @param {HTMLElement} $item - Add another item
   */
  createRemoveButton($item) {
    if ($item.querySelector('.moj-add-another__remove-button')) {
      return
    }

    const $button = document.createElement('button')
    $button.type = 'button'

    $button.classList.add(
      'govuk-button',
      'govuk-button--secondary',
      'moj-add-another__remove-button'
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
  }

  /**
   * @param {HTMLElement} $item - Add another item
   */
  resetItem($item) {
    $item.querySelectorAll('[data-name], [data-id]').forEach(($input) => {
      if (!this.isValidInputElement($input)) {
        return
      }

      if ($input instanceof HTMLSelectElement) {
        $input.selectedIndex = -1
        $input.value = ''
      } else if ($input instanceof HTMLTextAreaElement) {
        $input.value = ''
      } else {
        switch ($input.type) {
          case 'checkbox':
          case 'radio':
            $input.checked = false
            break
          default:
            $input.value = ''
        }
      }
    })
  }

  /**
   * @param {MouseEvent} event - Click event
   */
  onRemoveButtonClick(event) {
    const $button = event.target

    if (
      !$button ||
      !($button instanceof HTMLButtonElement) ||
      !$button.classList.contains('moj-add-another__remove-button')
    ) {
      return
    }

    const $items = this.getItems()

    if ($items.length <= this.minItems) {
      return
    }

    $button.closest('.moj-add-another__item').remove()

    this.getItems().forEach(($item, index) => {
      this.updateAttributes($item, index)
    })

    this.updateRemoveButtonsVisibility()

    this.focusHeading()
  }

  focusHeading() {
    const $heading = this.$root.querySelector('.moj-add-another__heading')

    if ($heading && $heading instanceof HTMLElement) {
      $heading.focus()
    }
  }

  /**
   * @param {Element} $input - the input to validate
   */
  isValidInputElement($input) {
    return (
      $input instanceof HTMLInputElement ||
      $input instanceof HTMLSelectElement ||
      $input instanceof HTMLTextAreaElement
    )
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
  static moduleName = 'moj-add-another'
}
