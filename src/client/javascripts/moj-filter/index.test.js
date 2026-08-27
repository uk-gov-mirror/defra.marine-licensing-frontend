// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { FilterToggleButton } from '@ministryofjustice/frontend'
import { MojFilter } from './index.js'

vi.mock('@ministryofjustice/frontend', () => ({
  FilterToggleButton: vi.fn()
}))

describe('MojFilter', () => {
  describe('when the root element is missing or not a div', () => {
    it('should not throw when no element matches the moj-filter selector', () => {
      document.body.innerHTML = ''

      expect(() => new MojFilter()).not.toThrow()
      expect(FilterToggleButton).not.toHaveBeenCalled()
    })
  })

  describe('when the root element is present', () => {
    it('should create a FilterToggleButton with the root element', () => {
      document.body.innerHTML = '<div data-module="moj-filter"></div>'
      const $root = document.querySelector('[data-module="moj-filter"]')
      const init = () => new MojFilter()
      init()

      expect(FilterToggleButton).toHaveBeenCalledWith($root, expect.any(Object))
    })
  })
})
