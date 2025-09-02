import {
  COORDINATE_SYSTEMS,
  POLYGON_MIN_COORDINATE_POINTS
} from '~/src/server/common/constants/exemptions.js'
import { routes } from '~/src/server/common/constants/routes.js'
import {
  getExemptionCache,
  updateExemptionSiteDetails
} from '~/src/server/common/helpers/session-cache/utils.js'
import { getCoordinateSystem } from '~/src/server/common/helpers/coordinate-utils.js'
import {
  MULTIPLE_COORDINATES_VIEW_ROUTES,
  normaliseCoordinatesForDisplay,
  multipleCoordinatesPageData,
  convertPayloadToCoordinatesArray,
  convertArrayErrorsToFlattenedErrors,
  handleValidationFailure,
  removeCoordinateAtIndex
} from './utils.js'
import { validateCoordinates } from '~/src/server/exemption/site-details/enter-multiple-coordinates/validation/validation.js'

export const multipleCoordinatesController = {
  handler(request, h) {
    const { projectName, siteDetails = {} } = getExemptionCache(request) || {}

    const coordinateSystem =
      siteDetails.coordinateSystem === COORDINATE_SYSTEMS.OSGB36
        ? COORDINATE_SYSTEMS.OSGB36
        : COORDINATE_SYSTEMS.WGS84

    const coordinates = normaliseCoordinatesForDisplay(
      coordinateSystem,
      siteDetails.coordinates
    )

    const paddedCoordinates = [...coordinates]
    const emptyCoordinate =
      coordinateSystem === COORDINATE_SYSTEMS.OSGB36
        ? { eastings: '', northings: '' }
        : { latitude: '', longitude: '' }

    while (paddedCoordinates.length < POLYGON_MIN_COORDINATE_POINTS) {
      paddedCoordinates.push({ ...emptyCoordinate })
    }

    return h.view(MULTIPLE_COORDINATES_VIEW_ROUTES[coordinateSystem], {
      ...multipleCoordinatesPageData,
      coordinates: paddedCoordinates,
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
    coordinateSystem,
    coordinates
  )
  // Pad coordinates to at least 3 items
  const minCoords = 3
  const paddedCoordinates = [...coordinatesForDisplay]
  const emptyCoordinate =
    coordinateSystem === COORDINATE_SYSTEMS.OSGB36
      ? { eastings: '', northings: '' }
      : { latitude: '', longitude: '' }
  while (paddedCoordinates.length < minCoords) {
    paddedCoordinates.push({ ...emptyCoordinate })
  }
  return h.view(MULTIPLE_COORDINATES_VIEW_ROUTES[coordinateSystem], {
    ...multipleCoordinatesPageData,
    coordinates: paddedCoordinates,
    projectName
  })
}

export const multipleCoordinatesSubmitController = {
  options: {},
  handler(request, h) {
    const { payload } = request
    const exemption = getExemptionCache(request)
    const { coordinateSystem } = getCoordinateSystem(request)

    let coordinates = convertPayloadToCoordinatesArray(
      payload,
      coordinateSystem
    )

    if (payload.remove) {
      coordinates = removeCoordinateAtIndex(
        coordinates,
        parseInt(payload.remove)
      )
    }

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

    updateExemptionSiteDetails(request, 'coordinates', coordinates)

    if (payload.add) {
      const emptyCoordinate =
        coordinateSystem === COORDINATE_SYSTEMS.OSGB36
          ? { eastings: '', northings: '' }
          : { latitude: '', longitude: '' }

      coordinates = [...coordinates, emptyCoordinate]

      return renderMultipleCoordinatesView(
        h,
        coordinates,
        coordinateSystem,
        exemption?.projectName
      )
    }

    if (payload.remove) {
      return renderMultipleCoordinatesView(
        h,
        coordinates,
        coordinateSystem,
        exemption?.projectName
      )
    }

    return h.redirect(routes.REVIEW_SITE_DETAILS)
  }
}
