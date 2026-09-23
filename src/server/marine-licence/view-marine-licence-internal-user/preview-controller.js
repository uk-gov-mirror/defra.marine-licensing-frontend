import Boom from '@hapi/boom'
import { errorMessages } from '#src/server/common/constants/error-messages.js'
import { getMarineLicenceService } from '#src/services/marine-licence-service/index.js'
import { isProjectViewable } from '#src/server/common/helpers/view-details/utils.js'
import { wrapRedactionLabels } from '#src/server/common/helpers/marine-licence/redaction-label.js'
import { buildApplicationDetailsCardData } from '#src/server/marine-licence/view-details/utils.js'

export const PREVIEW_VIEW_ROUTE =
  'marine-licence/view-marine-licence-internal-user/preview'

const publishedProjectName = (marineLicence) => {
  const redaction = marineLicence.redactions?.projectName

  if (redaction && 'redactedText' in redaction) {
    return redaction.redactedText
  }

  return marineLicence.projectName
}

export const previewController = {
  async handler(request, h) {
    const { applicationReference } = request.params

    try {
      const service = getMarineLicenceService(request)
      const marineLicence =
        await service.getMarineLicenceByReference(applicationReference)

      if (!isProjectViewable(marineLicence)) {
        throw Boom.forbidden(errorMessages.MARINE_LICENCE_NOT_SUBMITTED)
      }

      const projectName = publishedProjectName(marineLicence)

      return h.view(PREVIEW_VIEW_ROUTE, {
        pageTitle: projectName,
        pageCaption: marineLicence.applicationReference,
        headingHtml: wrapRedactionLabels(projectName),
        ...buildApplicationDetailsCardData(marineLicence)
      })
    } catch (error) {
      if (error.isBoom) {
        throw error
      }

      request.logger.error(error, 'Error displaying marine licence preview')
      throw Boom.internal('Error displaying marine licence preview')
    }
  }
}
