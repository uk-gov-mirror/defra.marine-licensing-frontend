export const getApplicantOrganisationFromToken = (decodedToken) => {
  const { currentRelationshipId, relationships, enrolmentCount, roles } =
    decodedToken
  if (
    !currentRelationshipId ||
    !relationships ||
    !Array.isArray(relationships) ||
    !enrolmentCount ||
    !roles ||
    !Array.isArray(roles)
  ) {
    return {
      applicantOrganisationId: null,
      applicantOrganisationName: null,
      hasMultipleOrganisations: false
    }
  }
  const relationship = relationships.find((r) =>
    r.startsWith(currentRelationshipId)
  )
  // destructure the relationships array eg
  // 81d48d6c-6e94-f011-b4cc-000d3ac28f39:27d48d6c-6e94-f011-b4cc-000d3ac28f39:CDP Child Org 1:0:Employee:0
  // which is colon-separated with the following parts:
  // relationshipId:organisationId:organisationName:organisationLoa:relationship:relationshipLoa.
  const [, applicantOrganisationId, applicantOrganisationName] =
    relationship?.split(':') || []

  const hasMultipleOrganisations =
    enrolmentCount > roles.length || relationships.length > 1
  return {
    applicantOrganisationId: applicantOrganisationId || null,
    applicantOrganisationName: applicantOrganisationName || null,
    hasMultipleOrganisations
  }
}
