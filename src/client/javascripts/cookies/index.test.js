/**
 * @jest-environment jsdom
 */

import { CookieSettings } from './index.js'

describe('CookieSettings', () => {
  let mockForm
  let mockClarity

  beforeEach(() => {
    document.body.innerHTML = `
      <form data-module="cookie-settings">
        <input type="radio" name="analytics" value="yes" />
        <input type="radio" name="analytics" value="no" />
        <button type="submit">Save</button>
      </form>
    `
    mockForm = document.querySelector('[data-module="cookie-settings"]')

    mockClarity = jest.fn()
    window.clarity = mockClarity
  })

  afterEach(() => {
    document.body.innerHTML = ''
    delete window.clarity
  })

  describe('constructor', () => {
    test('should initialize with form element', () => {
      const cookieSettings = new CookieSettings(mockForm)
      expect(cookieSettings.form).toBe(mockForm)
      expect(cookieSettings.analyticsRadios).toHaveLength(2)
    })

    test('should attach submit event listener', () => {
      const addEventListenerSpy = jest.spyOn(mockForm, 'addEventListener')
      new CookieSettings(mockForm) // eslint-disable-line no-new
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'submit',
        expect.any(Function)
      )
    })
  })

  describe('handleSubmit', () => {
    test('should call clarity consent with true when analytics is accepted', () => {
      new CookieSettings(mockForm) // eslint-disable-line no-new
      const yesRadio = mockForm.querySelector('input[value="yes"]')
      yesRadio.checked = true

      const event = new Event('submit')
      mockForm.dispatchEvent(event)

      expect(mockClarity).toHaveBeenCalledWith('consent', true)
    })

    test('should call clarity consent with false when analytics is rejected', () => {
      new CookieSettings(mockForm) // eslint-disable-line no-new
      const noRadio = mockForm.querySelector('input[value="no"]')
      noRadio.checked = true

      const event = new Event('submit')
      mockForm.dispatchEvent(event)

      expect(mockClarity).toHaveBeenCalledWith('consent', false)
    })

    test('should not call clarity if window.clarity is not available', () => {
      delete window.clarity
      new CookieSettings(mockForm) // eslint-disable-line no-new
      const yesRadio = mockForm.querySelector('input[value="yes"]')
      yesRadio.checked = true

      const event = new Event('submit')
      mockForm.dispatchEvent(event)

      expect(mockClarity).not.toHaveBeenCalled()
    })

    test('should handle errors gracefully', () => {
      window.clarity = jest.fn(() => {
        throw new Error('Clarity error')
      })

      new CookieSettings(mockForm) // eslint-disable-line no-new
      const yesRadio = mockForm.querySelector('input[value="yes"]')
      yesRadio.checked = true

      const event = new Event('submit')
      mockForm.dispatchEvent(event)

      expect(() => mockForm.dispatchEvent(event)).not.toThrow()
    })
  })
})
