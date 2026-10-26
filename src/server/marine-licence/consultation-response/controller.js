import Boom from '@hapi/boom'
import {
  apiRoutes,
  marineLicenceConsultationDetailsRoutes
} from '#src/server/common/constants/routes.js'
import { authenticatedPatchRequest } from '#src/server/common/helpers/authenticated-requests.js'
import { validateConsulteeUserSession } from '#src/server/common/helpers/user-session-validators.js'
import { fetchConsultation } from '#src/server/common/helpers/marine-licence/fetch-consultation.js'
import {
  errorDescriptionByFieldName,
  mapErrorsForDisplay
} from '#src/server/common/helpers/errors.js'
import { consultationResponseSchema } from '#src/server/marine-licence/consultation-response/schema.js'

export const CONSULTATION_RESPONSE_VIEW_ROUTE =
  'marine-licence/consultation-response/index'

export const errorMessages = {
  CONSULTATION_RESPONSE_REQUIRED: 'Enter your response to the consultation',
  CONSULTATION_RESPONSE_MAX_LENGTH:
    'Your response to the consultation must be 1000 characters or fewer'
}

const consultationResponseSettings = {
  pageTitle: 'Your response',
  heading: 'Your response'
}

const getConsultationDetailsLink = (marineLicenceId) =>
  marineLicenceConsultationDetailsRoutes.MARINE_LICENCE_CONSULTATION_DETAILS.replace(
    '{marineLicenceId}',
    marineLicenceId
  )

const getViewContext = async (request) => {
  const { marineLicenceId } = request.params
  const consultation = await fetchConsultation(request, marineLicenceId)

  if (!consultation) {
    throw Boom.notFound('Consultation not found')
  }

  return {
    ...consultationResponseSettings,
    projectName: consultation.projectName,
    backLink: getConsultationDetailsLink(marineLicenceId)
  }
}

export const consultationResponseController = {
  options: {
    pre: [validateConsulteeUserSession]
  },
  async handler(request, h) {
    return h.view(
      CONSULTATION_RESPONSE_VIEW_ROUTE,
      await getViewContext(request)
    )
  }
}

export const consultationResponseSubmitController = {
  options: {
    pre: [validateConsulteeUserSession],
    validate: {
      payload: consultationResponseSchema,
      failAction: async (request, h, err) => {
        const errorSummary = mapErrorsForDisplay(err.details, errorMessages)

        return h
          .view(CONSULTATION_RESPONSE_VIEW_ROUTE, {
            ...(await getViewContext(request)),
            payload: request.payload,
            errors: errorDescriptionByFieldName(errorSummary),
            errorSummary
          })
          .takeover()
      }
    }
  },
  async handler(request, h) {
    const { marineLicenceId } = request.params

    await authenticatedPatchRequest(
      request,
      apiRoutes.UPDATE_CONSULTATION_REQUEST,
      {
        response: request.payload.consultationResponse,
        id: marineLicenceId
      }
    )

    return h.redirect(getConsultationDetailsLink(marineLicenceId))
  }
}
