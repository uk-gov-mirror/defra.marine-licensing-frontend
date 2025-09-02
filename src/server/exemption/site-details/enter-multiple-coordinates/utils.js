import {
  COORDINATE_SYSTEMS,
  POLYGON_MIN_COORDINATE_POINTS
} from '~/src/server/common/constants/exemptions.js'
import { routes } from '~/src/server/common/constants/routes.js'
import { getExemptionCache } from '~/src/server/common/helpers/session-cache/utils.js'
import { generatePointSpecificErrorMessage } from '~/src/server/common/helpers/site-details.js'

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

export const PATTERNS = {
  FIELD_BRACKETS: /[[\]]/g
}

export const MULTIPLE_COORDINATES_VIEW_ROUTES = {
  [COORDINATE_SYSTEMS.WGS84]:
    'exemption/site-details/enter-multiple-coordinates/wgs84',
  [COORDINATE_SYSTEMS.OSGB36]:
    'exemption/site-details/enter-multiple-coordinates/osgb36'
}

export const multipleCoordinatesPageData = {
  heading:
    'Enter multiple sets of coordinates to mark the boundary of the site',
  backLink: routes.COORDINATE_SYSTEM_CHOICE
}

export const COORDINATE_FIELDS = {
  WGS84: {
    primary: 'latitude',
    secondary: 'longitude'
  },
  OSGB36: {
    primary: 'eastings',
    secondary: 'northings'
  }
}

// ============================================================================
// COORDINATE SYSTEM UTILITIES
// ============================================================================

export const isWGS84 = (coordinateSystem) =>
  coordinateSystem === COORDINATE_SYSTEMS.WGS84

const getCoordinateFields = (coordinateSystem) =>
  isWGS84(coordinateSystem) ? COORDINATE_FIELDS.WGS84 : COORDINATE_FIELDS.OSGB36

const createEmptyCoordinate = (coordinateSystem) => {
  const fields = getCoordinateFields(coordinateSystem)
  return { [fields.primary]: '', [fields.secondary]: '' }
}

const createDefaultCoordinates = (coordinateSystem) => {
  return Array.from({ length: POLYGON_MIN_COORDINATE_POINTS }, () =>
    createEmptyCoordinate(coordinateSystem)
  )
}

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Check if coordinates array is empty or has invalid first coordinate
 * @param {Array} coordinates - Array of coordinates
 * @returns {boolean} True if coordinates are empty or invalid
 */
const areCoordinatesEmptyOrInvalid = (coordinates) => {
  return coordinates.length === 0 || !coordinates[0]
}

/**
 * Check if coordinate data has fields for the expected coordinate system
 * @param {object} coordinate - First coordinate object
 * @param {string} coordinateSystem - Expected coordinate system
 * @returns {boolean} True if coordinate has the required fields for the system
 */
const doesCoordinateSystemMatchData = (coordinate, coordinateSystem) => {
  const hasWgs84Fields = coordinate?.latitude !== undefined
  const hasOsgb36Fields = coordinate?.eastings !== undefined

  if (coordinateSystem === COORDINATE_SYSTEMS.WGS84) {
    return hasWgs84Fields
  }

  if (coordinateSystem === COORDINATE_SYSTEMS.OSGB36) {
    return hasOsgb36Fields
  }

  return false
}

/**
 * Extract only the relevant fields for the coordinate system from a coordinate object
 * @param {object} coordinate - Coordinate object that may have mixed field types
 * @param {string} coordinateSystem - Target coordinate system
 * @returns {object} Coordinate with only the relevant fields
 */
const extractRelevantCoordinateFields = (coordinate, coordinateSystem) => {
  const fields = getCoordinateFields(coordinateSystem)
  return {
    [fields.primary]: coordinate[fields.primary] || '',
    [fields.secondary]: coordinate[fields.secondary] || ''
  }
}

/**
 * Normalise coordinates for display - ensures minimum 3 coordinates with empty defaults
 * @param {string} coordinateSystem - Coordinate system type
 * @param {Array} coordinates - Coordinate data
 * @returns {Array} Array of all coordinates
 */
export const normaliseCoordinatesForDisplay = (
  coordinateSystem,
  coordinates = []
) => {
  if (
    areCoordinatesEmptyOrInvalid(coordinates) ||
    !doesCoordinateSystemMatchData(coordinates[0], coordinateSystem)
  ) {
    return createDefaultCoordinates(coordinateSystem)
  }

  const normalisedCoordinates = coordinates.map((coord) =>
    extractRelevantCoordinateFields(coord, coordinateSystem)
  )

  while (normalisedCoordinates.length < POLYGON_MIN_COORDINATE_POINTS) {
    normalisedCoordinates.push(createEmptyCoordinate(coordinateSystem))
  }

  return normalisedCoordinates
}

export const extractCoordinateIndexFromFieldName = (fieldName) => {
  const indexMatch = fieldName.match(/coordinates(\d+)/)
  return indexMatch ? parseInt(indexMatch[1], 10) : 0
}

export const sanitiseFieldName = (fieldPath) =>
  fieldPath.join('').replace(PATTERNS.FIELD_BRACKETS, '')

export const sanitiseFieldId = (fieldName) =>
  fieldName
    .join('')
    .replace(PATTERNS.FIELD_BRACKETS, '')
    .replace(/(\d+)/g, '-$1-')

export const convertPayloadToCoordinatesArray = (payload, coordinateSystem) => {
  const coordinates = []
  const coordinateSystemKey = isWGS84(coordinateSystem) ? 'WGS84' : 'OSGB36'
  const fields = COORDINATE_FIELDS[coordinateSystemKey]

  const field1 = fields.primary
  const field2 = fields.secondary

  Object.keys(payload)
    .map((name) => {
      const match = /^coordinates\[(\d+)\]/.exec(name)
      return match ? Number(match[1]) : null
    })
    .filter((index) => index !== null)
    .sort((a, b) => a - b)
    .forEach((index) => {
      coordinates[index] = {
        [field1]: payload[`coordinates[${index}][${field1}]`] || '',
        [field2]: payload[`coordinates[${index}][${field2}]`] || ''
      }
    })

  return coordinates
}

// ============================================================================
// ERROR HANDLING FUNCTIONS
// ============================================================================

export const convertArrayErrorsToFlattenedErrors = (error) => {
  if (!error.details) {
    return error
  }

  const convertedDetails = error.details.map((detail) => {
    const path = detail.path
      .map((segment, index) => {
        if (index === 0) {
          return segment
        }
        return `[${segment}]`
      })
      .join('')

    return { ...detail, path: [path] }
  })

  return { ...error, details: convertedDetails }
}

export const processErrorDetail = (detail) => {
  const fieldName = sanitiseFieldName(detail.path)
  const fieldId = sanitiseFieldId(detail.path)
  const coordinateIndex = extractCoordinateIndexFromFieldName(fieldName)
  const enhancedMessage = generatePointSpecificErrorMessage(
    detail.message,
    coordinateIndex
  )

  return { fieldName, fieldId, coordinateIndex, enhancedMessage }
}

export const createErrorSummary = (validationError) => {
  return validationError.details.map((detail) => {
    const { fieldId, enhancedMessage } = processErrorDetail(detail)
    return {
      href: `#${fieldId}`,
      text: enhancedMessage
    }
  })
}

export const createFieldErrors = (validationError) => {
  const errors = {}

  validationError.details.forEach((detail) => {
    const { fieldName, enhancedMessage } = processErrorDetail(detail)
    errors[fieldName] = { text: enhancedMessage }
  })

  return errors
}

export const handleValidationFailure = (
  request,
  h,
  error,
  coordinateSystem
) => {
  const { payload } = request
  const exemption = getExemptionCache(request)
  const coordinates = convertPayloadToCoordinatesArray(
    payload,
    coordinateSystem
  )

  if (!error.details) {
    return h
      .view(MULTIPLE_COORDINATES_VIEW_ROUTES[coordinateSystem], {
        ...multipleCoordinatesPageData,
        coordinates,
        projectName: exemption?.projectName
      })
      .takeover()
  }

  const errorSummary = createErrorSummary(error)
  const errors = createFieldErrors(error)

  return h
    .view(MULTIPLE_COORDINATES_VIEW_ROUTES[coordinateSystem], {
      ...multipleCoordinatesPageData,
      coordinates,
      errors,
      projectName: exemption?.projectName,
      errorSummary
    })
    .takeover()
}

// ============================================================================
// ARRAY MANIPULATION UTILITIES
// ============================================================================

/**
 * Remove a coordinate at a given index, but only if index >= 3 and at least 3 remain after removal
 * @param {Array} coordinates - Array of coordinates
 * @param {number} index - Index to remove
 * @returns {Array} New array with coordinate removed if allowed, else original array
 */
export const removeCoordinateAtIndex = (coordinates, index) => {
  if (
    index >= POLYGON_MIN_COORDINATE_POINTS &&
    index < coordinates.length &&
    coordinates.length > POLYGON_MIN_COORDINATE_POINTS
  ) {
    return coordinates.slice(0, index).concat(coordinates.slice(index + 1))
  }
  return coordinates
}
