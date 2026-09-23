const publishedText = (redaction, value) =>
  redaction && 'redactedText' in redaction ? redaction.redactedText : value

export const buildPreviewProjectDetails = (marineLicence) => {
  const redactions = marineLicence.redactions ?? {}

  return {
    projectName: publishedText(redactions.projectName, marineLicence.projectName),
    projectBackground: publishedText(
      redactions.projectBackground,
      marineLicence.projectBackground
    ),
    preferredDates: publishedText(
      redactions.preferredDates,
      marineLicence.preferredDates
    )
  }
}
