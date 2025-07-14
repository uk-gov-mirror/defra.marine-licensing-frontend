/**
 * @jest-environment jsdom
 */

import { AddAnotherPoint } from './index.js'

jest.mock('govuk-frontend', () => ({
  Component: class {
    constructor($root) {
      this.$root = $root
      this.on = jest.fn()
    }
  }
}))

describe('AddAnotherPoint', () => {
  let $root, component

  function createOSGBHtml() {
    return `
      <div class="add-another-point" data-module="add-another-point" data-min-items="2">
        <div class="add-another-point__item">
          <fieldset class="govuk-fieldset">
            <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">Start and end point</legend>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-0-eastings">Eastings of start and end point</label>
              <input class="govuk-input" id="coordinates-0-eastings" name="coordinates[0][eastings]" type="text" value="" data-name="coordinates[%index%][eastings]" data-id="coordinates-%index%-eastings">
            </div>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-0-northings">Northings of start and end point</label>
              <input class="govuk-input" id="coordinates-0-northings" name="coordinates[0][northings]" type="text" value="" data-name="coordinates[%index%][northings]" data-id="coordinates-%index%-northings">
            </div>
          </fieldset>
        </div>
      </div>
    `
  }

  beforeEach(() => {
    document.body.innerHTML = createOSGBHtml()
    $root = document.querySelector('.add-another-point')
    component = new AddAnotherPoint($root)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('static moduleName', () => {
    it('should be "add-another-point"', () => {
      expect(AddAnotherPoint.moduleName).toBe('add-another-point')
    })
  })

  describe('constructor', () => {
    it('should set minItems from data attribute', () => {
      expect(component.minItems).toBe(2)
    })

    it('should default minItems to 1 if not specified', () => {
      $root.removeAttribute('data-min-items')
      const newComponent = new AddAnotherPoint($root)
      expect(newComponent.minItems).toBe(1)
    })
  })

  describe('getItems', () => {
    it('should return all items with correct class', () => {
      const items = component.getItems()
      expect(items).toHaveLength(1)
      expect(items[0].classList.contains('add-another-point__item')).toBe(true)
    })

    it('should return empty array if no root element', () => {
      component.$root = null
      const items = component.getItems()
      expect(items).toEqual([])
    })

    it('should filter out non-HTMLElements from getItems', () => {
      const textNode = document.createTextNode('not an element')
      $root.appendChild(textNode)

      const commentNode = document.createComment('not an element')
      $root.appendChild(commentNode)

      const div = document.createElement('div')
      div.className = 'add-another-point__item'
      $root.appendChild(div)

      const items = component.getItems()
      expect(items.every((item) => item instanceof HTMLElement)).toBe(true)
    })
  })

  describe('getNewItem', () => {
    it('should clone the first item', () => {
      const newItem = component.getNewItem()
      expect(newItem).toBeInstanceOf(HTMLElement)
      expect(newItem.classList.contains('add-another-point__item')).toBe(true)
    })

    it('should return null from getNewItem if there are no items', () => {
      $root
        .querySelectorAll('.add-another-point__item')
        .forEach((item) => item.remove())

      expect(component.getNewItem()).toBeNull()
    })

    it('should remove existing remove button from cloned item', () => {
      const firstItem = $root.querySelector('.add-another-point__item')
      component.createRemoveButton(firstItem)

      const newItem = component.getNewItem()
      expect(
        newItem.querySelector('.add-another-point__remove-button')
      ).toBeNull()
    })
  })

  describe('updateAttributes', () => {
    it.each([
      [
        0,
        'coordinates[0][eastings]',
        'coordinates-0-eastings',
        'Eastings of start and end point',
        'Start and end point'
      ],
      [
        1,
        'coordinates[1][eastings]',
        'coordinates-1-eastings',
        'Eastings of point 2',
        'Point 2'
      ],
      [
        2,
        'coordinates[2][eastings]',
        'coordinates-2-eastings',
        'Eastings of point 3',
        'Point 3'
      ]
    ])(
      'should update input name, id, label for, label text, and legend text for index %i',
      (
        index,
        expectedName,
        expectedId,
        expectedLabelText,
        expectedLegendText
      ) => {
        const item = $root.querySelector('.add-another-point__item')
        const input = item.querySelector('input[data-name*="eastings"]')
        const label = item.querySelector('label[for="coordinates-0-eastings"]')
        const legend = item.querySelector('.govuk-fieldset__legend--s')

        component.updateAttributes(item, index)

        expect(input.name).toBe(expectedName)
        expect(input.id).toBe(expectedId)
        expect(label.htmlFor).toBe(expectedId)
        expect(label.textContent).toBe(expectedLabelText)
        expect(legend.textContent).toBe(expectedLegendText)
      }
    )

    it('should handle latitude/longitude field names', () => {
      const item = document.createElement('div')
      item.innerHTML = `
        <div class="govuk-form-group">
          <label class="govuk-label" for="coordinates-0-latitude">Latitude</label>
          <input class="govuk-input" id="coordinates-0-latitude" name="coordinates[0][latitude]" type="text"
                 data-name="coordinates[%index%][latitude]" data-id="coordinates-%index%-latitude">
        </div>
      `

      component.updateAttributes(item, 0)

      const label = item.querySelector('label')
      expect(label.textContent).toBe('Latitude of start and end point')
    })

    it('should update error message id and text, and input aria-describedby', () => {
      const itemWithError = document.createElement('div')
      itemWithError.className = 'add-another-point__item'
      itemWithError.innerHTML = `
      <fieldset class="govuk-fieldset">
        <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">Point 4</legend>
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="coordinates-3-eastings">Eastings of point 4</label>
          <p id="coordinates-4-eastings-error" class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter the eastings of point 5
          </p>
          <input class="govuk-input govuk-input--error" id="coordinates-3-eastings" name="coordinates[3][eastings]" type="text" value="" aria-describedby="coordinates-4-eastings-error" data-name="coordinates[%index%][eastings]" data-id="coordinates-%index%-eastings">
        </div>
      </fieldset>
    `
      $root.appendChild(itemWithError)

      const input = itemWithError.querySelector('input')
      const errorMessage = itemWithError.querySelector('.govuk-error-message')

      component.updateAttributes(itemWithError, 3)

      expect(input.id).toBe('coordinates-3-eastings')
      expect(input.name).toBe('coordinates[3][eastings]')
      expect(input.getAttribute('aria-describedby')).toBe(
        'coordinates-3-eastings-error'
      )

      expect(errorMessage.id).toBe('coordinates-3-eastings-error')

      expect(errorMessage.textContent).toContain('point 4')
    })

    it('should not throw if label is not found', () => {
      const item = $root.querySelector('.add-another-point__item')
      item.querySelectorAll('label').forEach((label) => label.remove())

      expect(() => component.updateAttributes(item, 0)).not.toThrow()
    })

    it('should skip invalid input elements', () => {
      const item = document.createElement('div')
      const invalidInput = document.createElement('input')
      invalidInput.type = 'checkbox'
      invalidInput.setAttribute('data-name', 'test')
      item.appendChild(invalidInput)

      expect(() => component.updateAttributes(item, 0)).not.toThrow()
    })

    it.each([
      [
        'latitude',
        'Latitude',
        'Latitude of start and end point',
        'Latitude of point 2',
        'Latitude of point 3'
      ],
      [
        'longitude',
        'Longitude',
        'Longitude of start and end point',
        'Longitude of point 2',
        'Longitude of point 3'
      ]
    ])(
      'should update label and legend for %s fields',
      (
        fieldName,
        baseLabelText,
        expectedLabelText0,
        expectedLabelText1,
        expectedLabelText2
      ) => {
        const item = document.createElement('div')
        item.className = 'add-another-point__item'
        item.innerHTML = `
          <fieldset class="govuk-fieldset">
            <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">Start and end point</legend>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-0-${fieldName}">${baseLabelText} of start and end point</label>
              <input class="govuk-input" id="coordinates-0-${fieldName}" name="coordinates[0][${fieldName}]" type="text" data-name="coordinates[%index%][${fieldName}]" data-id="coordinates-%index%-${fieldName}">
            </div>
          </fieldset>
        `
        component.updateAttributes(item, 0)
        let label = item.querySelector('label')
        let legend = item.querySelector('.govuk-fieldset__legend--s')
        expect(label.textContent).toBe(expectedLabelText0)
        expect(legend.textContent).toBe('Start and end point')

        component.updateAttributes(item, 1)
        label = item.querySelector('label')
        legend = item.querySelector('.govuk-fieldset__legend--s')
        expect(label.textContent).toBe(expectedLabelText1)
        expect(legend.textContent).toBe('Point 2')

        component.updateAttributes(item, 2)
        label = item.querySelector('label')
        legend = item.querySelector('.govuk-fieldset__legend--s')
        expect(label.textContent).toBe(expectedLabelText2)
        expect(legend.textContent).toBe('Point 3')
      }
    )
  })

  describe('createRemoveButton', () => {
    it('should create a remove button with correct classes', () => {
      const item = $root.querySelector('.add-another-point__item')
      component.createRemoveButton(item)

      const button = item.querySelector('.add-another-point__remove-button')
      expect(button).toBeInstanceOf(HTMLButtonElement)
      expect(button.type).toBe('button')
      expect(button.classList.contains('govuk-button')).toBe(true)
      expect(button.classList.contains('govuk-button--secondary')).toBe(true)
      expect(
        button.classList.contains('add-another-point__remove-button')
      ).toBe(true)
      expect(button.textContent).toBe('Remove')
    })

    it('should append button after legend in fieldset', () => {
      const item = $root.querySelector('.add-another-point__item')
      const legend = item.querySelector('.govuk-fieldset__legend')

      component.createRemoveButton(item)

      expect(
        legend.nextElementSibling.classList.contains(
          'add-another-point__remove-button'
        )
      ).toBe(true)
    })

    it('should not return a value', () => {
      const item = $root.querySelector('.add-another-point__item')
      const result = component.createRemoveButton(item)
      expect(result).toBeUndefined()
    })
  })

  describe('resetItem', () => {
    it('should reset text input values', () => {
      const item = document.createElement('div')
      item.className = 'add-another-point__item'
      const input = document.createElement('input')
      input.type = 'text'
      input.setAttribute('data-name', 'test')
      input.value = 'some value'
      item.appendChild(input)

      component.resetItem(item)

      expect(input.value).toBe('')
    })

    it('should reset textarea values', () => {
      const item = document.createElement('div')
      item.className = 'add-another-point__item'
      const textarea = document.createElement('textarea')
      textarea.setAttribute('data-name', 'test')
      textarea.value = 'some text'
      item.appendChild(textarea)

      component.resetItem(item)

      expect(textarea.value).toBe('')
    })

    it('should skip invalid input elements', () => {
      const item = document.createElement('div')
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.setAttribute('data-name', 'test')
      checkbox.checked = true
      item.appendChild(checkbox)

      expect(() => component.resetItem(item)).not.toThrow()
      expect(checkbox.checked).toBe(true)
    })
  })

  describe('isValidInputElement', () => {
    it('should return true for text inputs', () => {
      const input = document.createElement('input')
      input.type = 'text'
      expect(component.isValidInputElement(input)).toBe(true)
    })

    it('should return true for textarea elements', () => {
      const textarea = document.createElement('textarea')
      expect(component.isValidInputElement(textarea)).toBe(true)
    })

    it('should return false for non-text inputs', () => {
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      expect(component.isValidInputElement(checkbox)).toBe(false)
    })

    it('should return false for other element types', () => {
      const div = document.createElement('div')
      expect(component.isValidInputElement(div)).toBe(false)
    })

    it('should return false for select elements in isValidInputElement', () => {
      const select = document.createElement('select')
      expect(component.isValidInputElement(select)).toBe(false)
    })

    it('should return false for input type checkbox in isValidInputElement', () => {
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      expect(component.isValidInputElement(checkbox)).toBe(false)
    })

    it('should return false for input type radio in isValidInputElement', () => {
      const radio = document.createElement('input')
      radio.type = 'radio'
      expect(component.isValidInputElement(radio)).toBe(false)
    })
  })

  describe('updateRemoveButtonsVisibility', () => {
    it('should not show remove buttons for items with index less than minItems', () => {
      const item1 = $root.querySelector('.add-another-point__item')
      const item2 = item1.cloneNode(true)
      $root.appendChild(item2)
      component.updateRemoveButtonsVisibility()
      const items = component.getItems()
      items.forEach(($item) => {
        expect(
          $item.querySelector('.add-another-point__remove-button')
        ).toBeNull()
      })
    })

    it('should show remove buttons for items with index >= minItems', () => {
      const item1 = $root.querySelector('.add-another-point__item')
      const item2 = item1.cloneNode(true)
      const item3 = item1.cloneNode(true)
      $root.appendChild(item2)
      $root.appendChild(item3)
      component.updateRemoveButtonsVisibility()
      const items = component.getItems()

      expect(
        items[0].querySelector('.add-another-point__remove-button')
      ).toBeNull()
      expect(
        items[1].querySelector('.add-another-point__remove-button')
      ).toBeNull()
      expect(
        items[2].querySelector('.add-another-point__remove-button')
      ).not.toBeNull()
    })

    it('should remove remove buttons if items drop below minItems', () => {
      const item1 = $root.querySelector('.add-another-point__item')
      const item2 = item1.cloneNode(true)
      const item3 = item1.cloneNode(true)
      $root.appendChild(item2)
      $root.appendChild(item3)
      component.updateRemoveButtonsVisibility()

      item3.remove()
      component.updateRemoveButtonsVisibility()
      const items = component.getItems()
      items.forEach(($item) => {
        expect(
          $item.querySelector('.add-another-point__remove-button')
        ).toBeNull()
      })
    })

    it('should not duplicate remove buttons if already present', () => {
      const item1 = $root.querySelector('.add-another-point__item')
      const item2 = item1.cloneNode(true)
      const item3 = item1.cloneNode(true)
      $root.appendChild(item2)
      $root.appendChild(item3)

      component.createRemoveButton(item3)
      component.updateRemoveButtonsVisibility()
      const items = component.getItems()
      const removeButtons = items[2].querySelectorAll(
        '.add-another-point__remove-button'
      )
      expect(removeButtons).toHaveLength(1)
    })

    it('should remove an existing remove button for items with index less than minItems', () => {
      const item1 = $root.querySelector('.add-another-point__item')
      const item2 = item1.cloneNode(true)
      $root.appendChild(item2)

      component.createRemoveButton(item1)
      expect(
        item1.querySelector('.add-another-point__remove-button')
      ).not.toBeNull()
      component.updateRemoveButtonsVisibility()
      expect(
        item1.querySelector('.add-another-point__remove-button')
      ).toBeNull()
    })
  })

  describe('onAddButtonClick', () => {
    it('should return early if button is not HTMLButtonElement', () => {
      const span = document.createElement('span')
      const event = { target: span }

      expect(() => component.onAddButtonClick(event)).not.toThrow()
    })

    it('should return early if button does not have add-another-point__add-button class', () => {
      const button = document.createElement('button')
      const event = { target: button }

      expect(() => component.onAddButtonClick(event)).not.toThrow()
    })

    it('should return early if getNewItem returns null', () => {
      jest.spyOn(component, 'getNewItem').mockReturnValue(null)

      const button = document.createElement('button')
      button.classList.add('add-another-point__add-button')
      const event = { target: button }

      expect(() => component.onAddButtonClick(event)).not.toThrow()
    })

    it('should focus the first input in the new item after adding', () => {
      const addButton = document.createElement('button')
      addButton.className = 'add-another-point__add-button'
      $root.appendChild(addButton)

      $root.querySelectorAll('.add-another-point__item').forEach((item, i) => {
        if (i > 0) item.remove()
      })
      component = new AddAnotherPoint($root)
      const event = { target: addButton }
      component.onAddButtonClick(event)
      const items = $root.querySelectorAll('.add-another-point__item')
      const newItem = items[items.length - 1]
      const firstInput = newItem.querySelector('input')
      expect(document.activeElement).toBe(firstInput)
    })
  })

  describe('onRemoveButtonClick', () => {
    it('should prevent default and stop propagation', () => {
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: document.createElement('div')
      }

      component.onRemoveButtonClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('should return early if button is not HTMLButtonElement', () => {
      const span = document.createElement('span')
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: span
      }

      expect(() => component.onRemoveButtonClick(event)).not.toThrow()
    })

    it('should return early if button does not have remove button class', () => {
      const button = document.createElement('button')
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: button
      }

      expect(() => component.onRemoveButtonClick(event)).not.toThrow()
    })

    it('should return early if items length is less than or equal to minItems', () => {
      const button = document.createElement('button')
      button.classList.add('add-another-point__remove-button')
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: button
      }

      jest.spyOn(component, 'getItems').mockReturnValue([{}, {}])

      expect(() => component.onRemoveButtonClick(event)).not.toThrow()
    })

    it('should remove the item from the DOM when the remove button is clicked', () => {
      const item1 = $root.querySelector('.add-another-point__item')
      const item2 = item1.cloneNode(true)
      const item3 = item1.cloneNode(true)
      $root.appendChild(item2)
      $root.appendChild(item3)
      component.updateRemoveButtonsVisibility()
      const items = component.getItems()

      const removeButton = items[2].querySelector(
        '.add-another-point__remove-button'
      )
      expect(removeButton).not.toBeNull()

      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: removeButton
      }
      component.onRemoveButtonClick(event)

      const updatedItems = component.getItems()
      expect(updatedItems).toHaveLength(2)

      expect($root.contains(items[2])).toBe(false)
    })
  })
})
