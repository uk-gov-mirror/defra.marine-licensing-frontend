import { buildPreviewProjectDetails } from '#src/server/marine-licence/view-marine-licence-internal-user/preview-project-details.js'

const marineLicence = {
  projectName: 'Test Project',
  projectBackground: 'Test project background',
  preferredDates: 'July 2026 to August 2027'
}

describe('buildPreviewProjectDetails', () => {
  test('returns the same project fields as the standard page when nothing is redacted', () => {
    expect(buildPreviewProjectDetails(marineLicence)).toEqual({
      projectName: 'Test Project',
      projectBackground: 'Test project background',
      preferredDates: 'July 2026 to August 2027'
    })
  })

  test.each([
    ['projectName', 'Harbour ***REDACTED*** works'],
    ['projectBackground', 'Works at ***REDACTED***'],
    ['preferredDates', 'From ***REDACTED***']
  ])('publishes redacted %s and leaves the other fields', (field, redactedText) => {
    expect(
      buildPreviewProjectDetails({
        ...marineLicence,
        redactions: { [field]: { redactedText } }
      })
    ).toEqual({
      ...marineLicence,
      [field]: redactedText
    })
  })
})
