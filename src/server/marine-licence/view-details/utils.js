import { formatDate } from '#src/config/nunjucks/filters/format-date.js'
import { getTagStyle } from '#src/server/common/helpers/ui/get-tag-style.js'
import { PROJECT_STATUS } from '#src/server/common/constants/projects.js'
import { getStatusLabelText } from '#src/server/dashboard/utils.js'

const APPLICATION_DATE_FORMAT = 'd MMM yyyy'

const DATE_FORMAT = 'd MMM yyyy'

export const buildApplicationDetailsCardData = (marineLicence) => {
  const {
    applicationReference,
    status,
    submittedAt,
    transferredDate,
    withdrawnAt
  } = marineLicence

  return {
    applicationReference,
    submittedAt: formatDate(submittedAt, DATE_FORMAT),
    transferredDate: formatDate(transferredDate, DATE_FORMAT),
    withdrawnAt: formatDate(withdrawnAt, DATE_FORMAT),
    isTransferred: status === PROJECT_STATUS.TRANSFERRED,
    isWithdrawn: status === PROJECT_STATUS.WITHDRAWN,
    statusTag: `<strong class="govuk-tag ${getTagStyle(status)}">${escapeHtml(status)}</strong>`
    rejectedDate,
    rejectedReasons,
    rejectedInformation,
    transferredDate
  } = marineLicence

  const isTransferred = status === PROJECT_STATUS.TRANSFERRED
  const isRejected = status === PROJECT_STATUS.REJECTED

  return {
    applicationReference,
    submittedAt: formatDate(submittedAt, APPLICATION_DATE_FORMAT),
    transferredDate: formatDate(transferredDate, APPLICATION_DATE_FORMAT),
    rejectedDate: formatDate(rejectedDate, APPLICATION_DATE_FORMAT),
    rejectedReasons: rejectedReasons
      ? rejectedReasons.split(',')
      : rejectedReasons,
    rejectedInformation,
    isTransferred,
    isRejected,
    showApplicationDetailsCard: isTransferred || isRejected,
    status,
    statusTag: `<strong class="govuk-tag ${getTagStyle(status)}">${getStatusLabelText(status)}</strong>`
  }
}
