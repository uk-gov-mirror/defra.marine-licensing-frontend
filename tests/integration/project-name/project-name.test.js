import { getByRole, getByText, queryByRole } from '@testing-library/dom'
import { routes } from '~/src/server/common/constants/routes.js'
import {
  mockExemption,
  setupTestServer
} from '~/tests/integration/shared/test-setup-helpers.js'
import { loadPage, submitForm } from '~/tests/integration/shared/app-server.js'
import {
  expectInputError,
  expectInputValue
} from '~/tests/integration/shared/expect-utils.js'

describe('Project name', () => {
  const getServer = setupTestServer()

  test('should render page elements when no project name set', async () => {
    const exemptionNoProjectName = {
      id: 'test-exemption-123'
    }
    mockExemption(exemptionNoProjectName)
    const document = await loadPage({
      requestUrl: routes.PROJECT_NAME,
      server: getServer()
    })
    expect(getByRole(document, 'heading', { level: 1 })).toHaveTextContent(
      'Project name'
    )
    getByRole(document, 'button', {
      name: 'Save and continue'
    })
    expectInputValue({
      document,
      inputLabel: 'Project name',
      value: ''
    })
    expect(
      queryByRole(document, 'link', {
        name: 'Back'
      })
    ).not.toBeInTheDocument()
    expect(
      queryByRole(document, 'link', {
        name: 'Cancel'
      })
    ).not.toBeInTheDocument()
  })

  test('should render page elements when a project name is set', async () => {
    const exemptionNoProjectName = {
      id: 'test-exemption-123',
      projectName: 'Test Project'
    }
    mockExemption(exemptionNoProjectName)
    const document = await loadPage({
      requestUrl: routes.PROJECT_NAME,
      server: getServer()
    })

    expectInputValue({
      document,
      inputLabel: 'Project name',
      value: 'Test Project'
    })
    expect(getByRole(document, 'heading', { level: 1 })).toHaveTextContent(
      'Project name'
    )
    getByRole(document, 'button', {
      name: 'Save and continue'
    })

    // only present when a project name is already saved
    expect(getByText(document, 'Test Project')).toBeInTheDocument()
    expect(
      getByRole(document, 'link', {
        name: 'Back'
      })
    ).toHaveAttribute('href', routes.TASK_LIST)
    expect(
      getByRole(document, 'link', {
        name: 'Cancel'
      })
    ).toHaveAttribute('href', routes.TASK_LIST)
  })

  test('should show a validation error when submitted without a project name', async () => {
    const submitProjectNameForm = async (formData) => {
      const { document } = await submitForm({
        requestUrl: routes.PROJECT_NAME,
        server: getServer(),
        formData
      })
      return document
    }

    const document = await submitProjectNameForm({ projectName: '' })
    expectInputError({
      document,
      inputLabel: 'Project name',
      errorMessage: 'Enter the project name'
    })
  })
})
