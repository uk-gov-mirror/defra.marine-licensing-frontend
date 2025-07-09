import { COORDINATE_SYSTEMS } from '~/src/server/common/constants/exemptions.js'
import {
  getExemptionCache,
  getCoordinateSystem
} from '~/src/server/common/helpers/session-cache/utils.js'
import {
  MULTIPLE_COORDINATES_VIEW_ROUTES,
  normaliseCoordinatesForDisplay,
  multipleCoordinatesPageData,
  convertPayloadToCoordinatesArray,
  validateCoordinates,
  convertArrayErrorsToFlattenedErrors,
  handleValidationFailure,
  saveCoordinatesToSession
} from './utils.js'

export const multipleCoordinatesController = {
  handler(request, h) {
    const { projectName, siteDetails = {} } = getExemptionCache(request) || {}

    const coordinateSystem =
      siteDetails.coordinateSystem === COORDINATE_SYSTEMS.OSGB36
        ? COORDINATE_SYSTEMS.OSGB36
        : COORDINATE_SYSTEMS.WGS84

    const multipleCoordinates = siteDetails.multipleCoordinates || {}

    const coordinates = normaliseCoordinatesForDisplay(
      multipleCoordinates[coordinateSystem] || [],
      coordinateSystem
    )

    return h.view(MULTIPLE_COORDINATES_VIEW_ROUTES[coordinateSystem], {
      ...multipleCoordinatesPageData,
      coordinates,
      projectName
    })
  }
}

function renderMultipleCoordinatesView(
  h,
  coordinates,
  coordinateSystem,
  projectName
) {
  const coordinatesForDisplay = normaliseCoordinatesForDisplay(
    coordinates,
    coordinateSystem
  )
  return h.view(MULTIPLE_COORDINATES_VIEW_ROUTES[coordinateSystem], {
    ...multipleCoordinatesPageData,
    coordinates: coordinatesForDisplay,
    projectName
  })
}

export const multipleCoordinatesSubmitController = {
  options: {},
  handler(request, h) {
    const { payload } = request
    const exemption = getExemptionCache(request)
    const { coordinateSystem } = getCoordinateSystem(request)

    const coordinates = convertPayloadToCoordinatesArray(
      payload,
      coordinateSystem
    )

    const validationResult = validateCoordinates(
      coordinates,
      exemption.id,
      coordinateSystem
    )

    if (validationResult.error) {
      const convertedError = convertArrayErrorsToFlattenedErrors(
        validationResult.error
      )
      return handleValidationFailure(
        request,
        h,
        convertedError,
        coordinateSystem
      )
    }

    if (payload.add) {
      let emptyCoordinate
      if (coordinateSystem === COORDINATE_SYSTEMS.OSGB36) {
        emptyCoordinate = { eastings: '', northings: '' }
      } else {
        emptyCoordinate = { latitude: '', longitude: '' }
      }
      const coordinatesWithEmpty = [...coordinates, emptyCoordinate]
      return renderMultipleCoordinatesView(
        h,
        coordinatesWithEmpty,
        coordinateSystem,
        exemption?.projectName
      )
    }

    saveCoordinatesToSession(request, coordinates, coordinateSystem)

    return renderMultipleCoordinatesView(
      h,
      coordinates,
      coordinateSystem,
      exemption?.projectName
    )
  }
}
