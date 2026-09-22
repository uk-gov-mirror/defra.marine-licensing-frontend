export const PROJECT_STATUS = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
  SUBMITTED: 'Submitted',
  TRANSFERRED: 'Transferred',
  WITHDRAWN: 'Withdrawn'
}

// Deliberately outside PROJECT_STATUS: a label to render, not a status an application
// can be in, so nothing comparing or filtering a lifecycle status should see it.
export const DISPLAY_STATUS = {
  ACTION_REQUIRED: 'Action required'
}

// While an application task is outstanding the API returns ACTION_REQUIRED as `status`
// and carries the real one on `previousStatus`. Every decision about where an
// application is in its lifecycle must use this, not `status`.
export const getLifecycleStatus = ({ status, previousStatus } = {}) =>
  previousStatus ?? status

// An exemption whose activity period has ended can no longer be withdrawn.
export const WITHDRAWABLE_EXEMPTION_STATUSES = [
  PROJECT_STATUS.SCHEDULED,
  PROJECT_STATUS.ACTIVE
]

export const UNABLE_TO_PROGRESS = 'Unable to progress'

export const PROJECT_TYPE = {
  EXEMPTION: 'exemption',
  MARINE_LICENCE: 'marine-licence'
}
