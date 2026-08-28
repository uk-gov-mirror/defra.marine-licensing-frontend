// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FilterToggleButton } from '@ministryofjustice/frontend'
import { MojFilter } from './index.js'

vi.mock('@ministryofjustice/frontend', () => ({
  FilterToggleButton: vi.fn()
}))

vi.mock('govuk-frontend', () => ({
  createAll: vi.fn()
}))

describe('MojFilter', () => {
  let assignSpy
  let fetchMock
  let originalLocation

  const buildFilterMarkup = ({ withClearLink = true } = {}) => `
      <form class="app-filter-form" action="/projects">
        <input type="hidden" name="csrfToken" value="test-token" />
        <div data-module="moj-filter">
          ${
            withClearLink
              ? '<div class="moj-filter__heading-action"><a href="/projects">Clear filters</a></div>'
              : ''
          }
          <input type="radio" name="show" value="all-projects" checked />
          <input type="radio" name="show" value="my-projects" />
        </div>
        <div id="app-project-results"></div>
      </form>
    `

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    originalLocation = window.location

    assignSpy = vi.fn()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy }
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    })
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

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

  describe('Clear filters link', () => {
    it('should not navigate and should reset the form when clicked', async () => {
      document.body.innerHTML = buildFilterMarkup()

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<div id="app-project-results"></div>'
      })
      vi.stubGlobal('fetch', fetchMock)

      const submitSpy = vi
        .spyOn(HTMLFormElement.prototype, 'submit')
        .mockImplementation(() => {})

      const init = () => new MojFilter()
      init()

      const $clearLink = document.querySelector('.moj-filter__heading-action a')
      $clearLink.click()

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled()
      })

      const $myProjectsRadio = document.querySelector(
        'input[value="my-projects"]'
      )
      const $allProjectsRadio = document.querySelector(
        'input[value="all-projects"]'
      )

      expect($myProjectsRadio.checked).toBe(true)
      expect($allProjectsRadio.checked).toBe(false)
      expect(assignSpy).not.toHaveBeenCalled()
      expect(submitSpy).not.toHaveBeenCalled()
    })

    it('should not navigate when the clear filters link is not present in the DOM', () => {
      document.body.innerHTML = buildFilterMarkup({ withClearLink: false })

      const submitSpy = vi
        .spyOn(HTMLFormElement.prototype, 'submit')
        .mockImplementation(() => {})

      expect(() => new MojFilter()).not.toThrow()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(assignSpy).not.toHaveBeenCalled()
      expect(submitSpy).not.toHaveBeenCalled()
    })
  })

  describe('announceResultCount', () => {
    it('should set the status text to the number of rendered result rows', () => {
      document.body.innerHTML = `
        <div data-module="moj-filter"></div>
        <div id="app-project-results">
          <div class="app-project-row"></div>
          <div class="app-project-row"></div>
        </div>
        <div id="app-project-results-status"></div>
      `

      const mojFilter = new MojFilter()
      mojFilter.announceResultCount()

      const $status = document.getElementById('app-project-results-status')
      expect($status.textContent).toBe('2 results')
    })

    it('should use the singular wording when there is exactly one result', () => {
      document.body.innerHTML = `
        <div data-module="moj-filter"></div>
        <div id="app-project-results">
          <div class="app-project-row"></div>
        </div>
        <div id="app-project-results-status"></div>
      `

      const mojFilter = new MojFilter()
      mojFilter.announceResultCount()

      const $status = document.getElementById('app-project-results-status')
      expect($status.textContent).toBe('1 result')
    })
  })
})
