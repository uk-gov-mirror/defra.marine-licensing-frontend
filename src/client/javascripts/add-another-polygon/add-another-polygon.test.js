/**
 * @jest-environment jsdom
 */

import { AddAnotherPolygon } from './index.js'

jest.mock('govuk-frontend', () => ({
  Component: class {
    constructor($root) {
      this.$root = $root
      this.on = jest.fn()
    }
  }
}))

describe('AddAnotherPolygon', () => {
  let $root, component

  function createPolygonHtml() {
    return `
      <div class="polygon-add-another" data-module="polygon-add-another" data-min-items="3" data-field-names="eastings,northings" data-polygon-add-another-init="">
        <input type="hidden" name="csrfToken" value="NcoYBL0etsnEnOi79DTYrcSqOjf0fBGpU4gDRmv3ZsO">
        <h2 class="govuk-heading-m polygon-add-another__heading" tabindex="-1">
          Coordinate points
        </h2>
        <div class="polygon-add-another__item">
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
        <div class="polygon-add-another__item">
          <fieldset class="govuk-fieldset">
            <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">Point 2</legend>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-1-eastings">Eastings of point 2</label>
              <input class="govuk-input" id="coordinates-1-eastings" name="coordinates[1][eastings]" type="text" value="" data-name="coordinates[%index%][eastings]" data-id="coordinates-%index%-eastings">
            </div>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-1-northings">Northings of point 2</label>
              <input class="govuk-input" id="coordinates-1-northings" name="coordinates[1][northings]" type="text" value="" data-name="coordinates[%index%][northings]" data-id="coordinates-%index%-northings">
            </div>
          </fieldset>
        </div>
        <div class="polygon-add-another__item">
          <fieldset class="govuk-fieldset">
            <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">Point 3</legend>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-2-eastings">Eastings of point 3</label>
              <input class="govuk-input" id="coordinates-2-eastings" name="coordinates[2][eastings]" type="text" value="" data-name="coordinates[%index%][eastings]" data-id="coordinates-%index%-eastings">
            </div>
            <div class="govuk-form-group">
              <label class="govuk-label" for="coordinates-2-northings">Northings of point 3</label>
              <input class="govuk-input" id="coordinates-2-northings" name="coordinates[2][northings]" type="text" value="" data-name="coordinates[%index%][northings]" data-id="coordinates-%index%-northings">
            </div>
          </fieldset>
        </div>
        <button type="button" class="govuk-button govuk-button--secondary polygon-add-another__add-button" data-module="govuk-button" name="add" value="add" data-govuk-button-init="">
          Add another point
        </button>
      </div>
    `
  }

  beforeEach(() => {
    document.body.innerHTML = createPolygonHtml()
    $root = document.querySelector('.polygon-add-another')
    component = new AddAnotherPolygon($root)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('static moduleName', () => {
    it('should be "polygon-add-another"', () => {
      expect(AddAnotherPolygon.moduleName).toBe('polygon-add-another')
    })
  })

  it('adds a new item when add button is clicked', () => {
    const addButton = $root.querySelector('.polygon-add-another__add-button')
    const initialItems = $root.querySelectorAll('.polygon-add-another__item')
    expect(initialItems).toHaveLength(3)

    addButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    const updatedItems = $root.querySelectorAll('.polygon-add-another__item')
    expect(updatedItems).toHaveLength(4)
  })

  it('adds a remove button to new items', () => {
    const addButton = $root.querySelector('.polygon-add-another__add-button')
    addButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    const items = $root.querySelectorAll('.polygon-add-another__item')
    let foundRemove = false
    items.forEach((item) => {
      if (item.querySelector('.polygon-add-another__remove-button')) {
        foundRemove = true
      }
    })
    expect(foundRemove).toBe(true)
  })

  it('removes an item when the remove button is clicked', () => {
    const addButton = $root.querySelector('.polygon-add-another__add-button')
    addButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    addButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    const items = $root.querySelectorAll('.polygon-add-another__item')
    expect(items).toHaveLength(5)
    const removeButtons = $root.querySelectorAll(
      '.polygon-add-another__remove-button'
    )

    removeButtons[0].dispatchEvent(
      new window.MouseEvent('click', { bubbles: true })
    )
    const updatedItems = $root.querySelectorAll('.polygon-add-another__item')
    expect(updatedItems).toHaveLength(4)
  })

  it('removes a newly added point when its remove button is clicked', () => {
    const addButton = $root.querySelector('.polygon-add-another__add-button')

    addButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    addButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    let items = $root.querySelectorAll('.polygon-add-another__item')
    expect(items).toHaveLength(5)

    const lastRemoveButton = items[4].querySelector(
      '.polygon-add-another__remove-button'
    )
    expect(lastRemoveButton).toBeTruthy()

    lastRemoveButton.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true })
    )

    items = $root.querySelectorAll('.polygon-add-another__item')
    expect(items).toHaveLength(4)

    const lastLegend = items[3].querySelector('.govuk-fieldset__legend--s')
    expect(lastLegend.textContent).toContain('Point 4')

    const legends = Array.from(items).map((item) =>
      item.querySelector('.govuk-fieldset__legend--s').textContent.trim()
    )
    expect(legends[0]).toBe('Start and end point')
    expect(legends[1]).toBe('Point 2')
    expect(legends[2]).toBe('Point 3')
    expect(legends[3]).toBe('Point 4')
  })

  describe('getNewItem', () => {
    it('throws if there are no items to clone', () => {
      // Remove all items
      $root
        .querySelectorAll('.polygon-add-another__item')
        .forEach((item) => item.remove())
      expect(() => component.getNewItem()).toThrow()
    })

    it('removes an existing remove button from the cloned item', () => {
      // Add a remove button to the first item
      const firstItem = $root.querySelector('.polygon-add-another__item')
      const removeButton = document.createElement('button')
      removeButton.className = 'polygon-add-another__remove-button'
      firstItem.appendChild(removeButton)
      // Now clone
      const newItem = component.getNewItem()
      expect(
        newItem.querySelector('polygon-add-another__remove-button')
      ).toBeNull()
    })
  })

  describe('updateAttributes', () => {
    it('updates label for and text content for index 0', () => {
      const item = $root.querySelector('.polygon-add-another__item')
      const input = item.querySelector('input[data-name*="eastings"]')
      const label = item.querySelector('label[for="coordinates-0-eastings"]')
      component.updateAttributes(item, 0)
      expect(input.id).toBe('coordinates-0-eastings')
      expect(label.htmlFor).toBe('coordinates-0-eastings')
      expect(label.textContent).toBe('Eastings of start and end point')
    })

    it('updates label for and text content for index > 0', () => {
      const item = $root.querySelectorAll('.polygon-add-another__item')[1]
      const input = item.querySelector('input[data-name*="eastings"]')
      const label = item.querySelector('label[for="coordinates-1-eastings"]')
      component.updateAttributes(item, 1)
      expect(input.id).toBe('coordinates-1-eastings')
      expect(label.htmlFor).toBe('coordinates-1-eastings')
      expect(label.textContent).toBe('Eastings of point 2')
    })

    it('updates legend text for index 0 and >0', () => {
      const item0 = $root.querySelectorAll('.polygon-add-another__item')[0]
      const legend0 = item0.querySelector('.govuk-fieldset__legend--s')
      component.updateAttributes(item0, 0)
      expect(legend0.textContent).toBe('Start and end point')

      const item1 = $root.querySelectorAll('.polygon-add-another__item')[1]
      const legend1 = item1.querySelector('.govuk-fieldset__legend--s')
      component.updateAttributes(item1, 1)
      expect(legend1.textContent).toBe('Point 2')
    })

    it('does not throw if label is not found', () => {
      const item = $root.querySelector('.polygon-add-another__item')
      // Remove all labels
      item.querySelectorAll('label').forEach((label) => label.remove())
      expect(() => component.updateAttributes(item, 0)).not.toThrow()
    })
  })

  describe('createRemoveButton', () => {
    it('appends the remove button directly to the item if no fieldset is found', () => {
      const item = document.createElement('div')
      item.className = 'polygon-add-another__item'
      // No fieldset inside
      component.createRemoveButton(item)
      const removeButton = item.querySelector(
        '.polygon-add-another__remove-button'
      )
      expect(removeButton).toBeTruthy()
      expect(removeButton.parentElement).toBe(item)
    })
  })

  describe('resetItem', () => {
    it('resets the value of a textarea', () => {
      const item = document.createElement('div')
      item.className = 'polygon-add-another__item'
      const textarea = document.createElement('textarea')
      textarea.setAttribute('data-name', 'foo')
      textarea.value = 'some text'
      item.appendChild(textarea)
      component.resetItem(item)
      expect(textarea.value).toBe('')
    })

    it('resets value for non-textarea input elements', () => {
      const item = document.createElement('div')
      item.className = 'polygon-add-another__item'
      const input = document.createElement('input')
      input.setAttribute('data-name', 'foo')
      input.value = 'should stay'
      item.appendChild(input)
      component.resetItem(item)
      expect(input.value).toBe('')
    })
  })

  describe('onRemoveButtonClick', () => {
    it('does not remove an item if the number of items is less than or equal to minItems', () => {
      // Set up with minItems = 3 and only 3 items
      $root.setAttribute('data-min-items', '3')
      // Remove extra items if any
      while ($root.querySelectorAll('.polygon-add-another__item').length > 3) {
        $root.querySelector('.polygon-add-another__item:last-child').remove()
      }
      component = new AddAnotherPolygon($root)
      // Add a remove button to the first item
      const firstItem = $root.querySelector('.polygon-add-another__item')
      component.createRemoveButton(firstItem)
      const removeButton = firstItem.querySelector(
        '.polygon-add-another__remove-button'
      )
      const initialCount = $root.querySelectorAll(
        '.polygon-add-another__item'
      ).length
      removeButton.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
      const afterCount = $root.querySelectorAll(
        '.polygon-add-another__item'
      ).length
      expect(afterCount).toBe(initialCount)
    })
  })

  describe('isValidInputElement', () => {
    it('returns true for a textarea and for an input', () => {
      const textarea = document.createElement('textarea')
      const input = document.createElement('input')
      expect(component.isValidInputElement(textarea)).toBe(true)
      expect(component.isValidInputElement(input)).toBe(true)
    })
  })
})
