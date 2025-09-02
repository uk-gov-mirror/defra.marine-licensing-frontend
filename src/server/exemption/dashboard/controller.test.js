import { createServer } from '~/src/server/index.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { config } from '~/src/config/config.js'
import { JSDOM } from 'jsdom'
import { dashboardController, DASHBOARD_VIEW_ROUTE } from './controller.js'
import { authenticatedGetRequest } from '~/src/server/common/helpers/authenticated-requests.js'
import { formatProjectsForDisplay } from './utils.js'
import { formatDate } from '~/src/config/nunjucks/filters/format-date.js'

jest.mock('~/src/server/common/helpers/authenticated-requests.js')
jest.mock('~/src/config/nunjucks/filters/format-date.js')
jest.mock('~/src/server/exemption/task-list/controller.js')

describe('#dashboard', () => {
  /** @type {Server} */
  let server

  const authenticatedGetRequestMock = jest.mocked(authenticatedGetRequest)
  jest.mocked(formatDate).mockReturnValue('01 Jan 2024')

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#dashboardController', () => {
    test('Should provide expected response with correct page title', async () => {
      authenticatedGetRequestMock.mockResolvedValueOnce({
        payload: { value: [] }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: routes.DASHBOARD
      })

      expect(result).toEqual(
        expect.stringContaining(`Your projects | ${config.get('serviceName')}`)
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render dashboard template with correct context', async () => {
      authenticatedGetRequestMock.mockResolvedValueOnce({
        payload: { value: [] }
      })

      const h = { view: jest.fn() }
      const request = { logger: { error: jest.fn() } }

      await dashboardController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(DASHBOARD_VIEW_ROUTE, {
        pageTitle: 'Your projects',
        heading: 'Your projects',
        projects: []
      })
    })

    test('Should display sortable table with correct structure when projects exist', async () => {
      const h = { view: jest.fn() }
      const request = { logger: { error: jest.fn() } }

      const projects = [
        {
          id: 'abc123',
          projectName: 'Test Project',

          reference: 'ML-2024-001',
          status: 'Draft',
          submittedAt: null
        }
      ]

      const expectedFormattedProjects = formatProjectsForDisplay(projects)

      expect(expectedFormattedProjects).toEqual([
        [
          { text: 'Test Project' },
          { text: 'Exempt activity notification' },
          { text: '-' },
          {
            html: '<strong class="govuk-tag govuk-tag--light-blue">Draft</strong>'
          },
          { text: '-' },
          {
            html: '<a href="/exemption/task-list/abc123" class="govuk-link govuk-!-margin-right-4 govuk-link--no-visited-state" aria-label="Continue to task list">Continue</a><a href="/exemption/delete/abc123" class="govuk-link" aria-label="Delete Test Project">Delete</a>'
          }
        ]
      ])

      authenticatedGetRequestMock.mockResolvedValueOnce({
        payload: { value: projects }
      })

      await dashboardController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(DASHBOARD_VIEW_ROUTE, {
        pageTitle: 'Your projects',
        heading: 'Your projects',
        projects: expectedFormattedProjects
      })
    })

    test('Should display empty state when no projects exist', async () => {
      authenticatedGetRequestMock.mockResolvedValueOnce({
        payload: { value: [] }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: routes.DASHBOARD
      })

      const { document } = new JSDOM(result).window

      const emptyState = document.querySelector('.govuk-body')
      expect(emptyState.textContent).toContain(
        'You currently have no projects.'
      )
    })

    test('Should display projects data when projects exist', async () => {
      const h = { view: jest.fn() }
      const request = { logger: { error: jest.fn() } }

      const projects = [
        {
          projectName: 'Test Project 1',

          reference: 'ML-2024-001',
          status: 'Draft',
          submittedAt: null
        },
        {
          projectName: 'Test Project 2',

          reference: 'ML-2024-002',
          status: 'Closed',
          submittedAt: '2024-01-15'
        }
      ]

      const expectedFormattedProjects = formatProjectsForDisplay(projects)

      authenticatedGetRequestMock.mockResolvedValueOnce({
        payload: { value: projects }
      })

      await dashboardController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(DASHBOARD_VIEW_ROUTE, {
        pageTitle: 'Your projects',
        heading: 'Your projects',
        projects: expectedFormattedProjects
      })
    })

    test('Should handle API errors gracefully', async () => {
      const h = { view: jest.fn() }
      const request = { logger: { error: jest.fn() } }

      authenticatedGetRequestMock.mockRejectedValueOnce(new Error('API Error'))

      await dashboardController.handler(request, h)

      expect(request.logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Error fetching projects'
      )

      expect(h.view).toHaveBeenCalledWith(DASHBOARD_VIEW_ROUTE, {
        pageTitle: 'Your projects',
        heading: 'Your projects',
        projects: []
      })
    })

    test('Should handle null payload value from API', async () => {
      const h = { view: jest.fn() }
      const request = { logger: { error: jest.fn() } }

      authenticatedGetRequestMock.mockResolvedValue({
        payload: {}
      })

      await dashboardController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(DASHBOARD_VIEW_ROUTE, {
        pageTitle: 'Your projects',
        heading: 'Your projects',
        projects: []
      })
    })

    test('Should display Continue link for draft exemptions pointing to /exemption/task-list/{id}', async () => {
      const draftExemption = {
        projectName: 'Draft Exemption',

        reference: 'ML-2024-003',
        status: 'Draft',
        submittedAt: null,
        id: 'abc123'
      }

      authenticatedGetRequestMock.mockResolvedValueOnce({
        payload: { value: [draftExemption] }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: routes.DASHBOARD
      })

      const { document } = new JSDOM(result).window

      const continueLink = Array.from(
        document.querySelectorAll('a,button')
      ).find((el) => el.textContent.trim() === 'Continue')
      expect(continueLink).toBeTruthy()
      expect(continueLink.getAttribute('href')).toBe(
        `/exemption/task-list/${draftExemption.id}`
      )
    })
  })
})
