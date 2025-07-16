import { Component } from 'govuk-frontend'

const REMOVE_BUTTON_CLASS = 'add-another-point__remove-button'
const ARIA_DESCRIBED_BY = 'aria-describedby'

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
        return
      }
      if (index < this.minItems && $removeButton) {
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
    if (!$items.length) {
      return null
    }
    const $item = $items[$items.length - 1].cloneNode(true)

    $item.querySelectorAll('.govuk-error-message').forEach(($error) => {
      $error.remove()
    })

    $item.querySelectorAll('.govuk-form-group').forEach(($group) => {
      $group.classList.remove('govuk-form-group--error')
    })
    $item.querySelectorAll('.govuk-input').forEach(($input) => {
      $input.classList.remove('govuk-input--error')

      if (
        ($input instanceof HTMLInputElement && $input.type === 'text') ||
        $input instanceof HTMLTextAreaElement
      ) {
        $input.value = ''
      }

      const describedBy = $input.getAttribute(ARIA_DESCRIBED_BY)
      if (describedBy && /-error\b/.test(describedBy)) {
        $input.removeAttribute(ARIA_DESCRIBED_BY)
      }
    })

    return $item
  }

  updateAttributes($item, index) {
    const updateInputAndLabel = (
      $input,
      rawDataName,
      rawDataId,
      originalId
    ) => {
      $input.name = rawDataName.replace(/%index%/, `${index}`)
      $input.id = rawDataId.replace(/%index%/, `${index}`)

      let $label = null

      if (originalId) {
        $label = $item.querySelector(`label[for="${originalId}"]`)
      }

      if (!$label) {
        $label = $input.closest('label')
      }

      if (!$label) {
        $label = $item.querySelector('label')
      }

      if ($label instanceof HTMLLabelElement) {
        $label.htmlFor = $input.id

        const processedDataName = rawDataName.replace(/%index%/, `${index}`)
        const fieldName = this._extractFieldName(processedDataName)

        if (index === 0) {
          $label.textContent = `${fieldName} of start and end point`
        } else {
          $label.textContent = `${fieldName} of point ${index + 1}`
        }
      }
    }

    const updateErrorMessage = ($input, originalAriaDescribedBy) => {
      const $originalErrorMessage = $item.querySelector(
        `#${originalAriaDescribedBy}`
      )

      if (!($originalErrorMessage instanceof HTMLElement)) {
        return
      }

      const $clonedErrorMessage = createClonedErrorMessage(
        $originalErrorMessage,
        $input.id
      )
      updatePointNumbers($clonedErrorMessage, originalAriaDescribedBy)

      $originalErrorMessage.replaceWith($clonedErrorMessage)
      $input.setAttribute(ARIA_DESCRIBED_BY, $clonedErrorMessage.id)
    }

    const createClonedErrorMessage = ($original, inputId) => {
      const $cloned = $original.cloneNode(true)
      $cloned.id = `${inputId}-error`
      return $cloned
    }

    const updatePointNumbers = ($errorMessage, originalAriaDescribedBy) => {
      const textNode = findTargetTextNode(
        $errorMessage,
        originalAriaDescribedBy
      )
      const pointPattern = /point \d+/gi

      if (textNode) {
        textNode.textContent = textNode.textContent.replace(
          pointPattern,
          `point ${index + 1}`
        )
      } else {
        $errorMessage.textContent = $errorMessage.textContent.replace(
          pointPattern,
          `point ${index + 1}`
        )
      }
    }

    const findTargetTextNode = ($errorMessage, originalAriaDescribedBy) => {
      const isErrorId = /-error\b/.test(originalAriaDescribedBy)
      let foundVisuallyHidden = false

      for (const node of $errorMessage.childNodes) {
        if (isElementWithClass(node, 'govuk-visually-hidden')) {
          foundVisuallyHidden = true
          continue
        }

        if (node.nodeType === Node.TEXT_NODE) {
          if (foundVisuallyHidden) {
            return node
          }

          if (
            !foundVisuallyHidden &&
            isErrorId &&
            node.textContent.includes('point')
          ) {
            return node
          }
        }
      }

      return null
    }

    const isElementWithClass = (node, className) => {
      return (
        node.nodeType === Node.ELEMENT_NODE &&
        node.classList.contains(className)
      )
    }

    $item.querySelectorAll('[data-name]').forEach(($input) => {
      if (!this.isValidInputElement($input)) {
        return
      }

      const rawDataName = $input.getAttribute('data-name') ?? ''
      const rawDataId = $input.getAttribute('data-id') ?? ''
      const originalId = $input.id

      updateInputAndLabel($input, rawDataName, rawDataId, originalId)

      const originalAriaDescribedBy = $input.getAttribute(ARIA_DESCRIBED_BY)

      if (originalAriaDescribedBy) {
        updateErrorMessage($input, originalAriaDescribedBy)
      }
    })

    const $fieldset = $item.querySelector('.govuk-fieldset')
    if ($fieldset instanceof HTMLFieldSetElement) {
      $fieldset.setAttribute('data-point-index', `${index}`)
    }

    const $legend = $item.querySelector('.govuk-fieldset__legend--s')
    if ($legend instanceof HTMLElement) {
      if (index === 0) {
        $legend.textContent = 'Start and end point'
      } else {
        $legend.textContent = `Point ${index + 1}`
      }
    }

    const $removeButton = $item.querySelector(`.${REMOVE_BUTTON_CLASS}`)
    if ($removeButton instanceof HTMLButtonElement) {
      $removeButton.value = `${index}`
    }
  }

  _extractFieldName(processedDataName) {
    const lastBracketIndex = processedDataName.lastIndexOf('[')
    if (lastBracketIndex !== -1 && processedDataName.endsWith(']')) {
      const fieldPart = processedDataName.slice(lastBracketIndex + 1, -1)
      return fieldPart.charAt(0).toUpperCase() + fieldPart.slice(1)
    }
    return ''
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

    if ($fieldset && $fieldset instanceof HTMLFieldSetElement) {
      const $legend = $fieldset.querySelector('.govuk-fieldset__legend')
      if ($legend) {
        $legend.after($button)
      } else {
        $fieldset.appendChild($button)
      }
    }
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

    $button.closest('.add-another-point__item')?.remove()

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
