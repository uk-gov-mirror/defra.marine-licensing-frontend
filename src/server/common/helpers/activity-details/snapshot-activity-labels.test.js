import {
  ACTIVITY_TYPE_LABELS,
  resolveActivityTypeLabel,
  resolveSelectionLabel,
  snapshotActivityLabels,
  snapshotSiteActivityLabels
} from '#src/server/common/helpers/activity-details/snapshot-activity-labels.js'

describe('snapshotActivityLabels', () => {
  test('adds activity type, subtype and selection labels', () => {
    const result = snapshotActivityLabels({
      activityType: 'construction',
      activitySubType: 'construction-type-1',
      activities: {
        selections: ['CON14', 'CON12']
      }
    })

    expect(result.activityTypeLabel).toBe(ACTIVITY_TYPE_LABELS.construction)
    expect(result.activitySubTypeLabel).toBe('Construction of new marine works')
    expect(result.activities.selectionLabels).toEqual([
      'Pontoons or floating walkways',
      'Slipway or boat ramp'
    ])
  })

  test('returns non-object activity unchanged', () => {
    expect(snapshotActivityLabels(null)).toBeNull()
    expect(snapshotActivityLabels('not-an-object')).toBe('not-an-object')
  })

  test('returns empty object when called with no argument', () => {
    expect(snapshotActivityLabels()).toEqual({})
  })

  test('keeps existing type and subtype labels', () => {
    const result = snapshotActivityLabels({
      activityType: 'construction',
      activitySubType: 'construction-type-1',
      activityTypeLabel: 'Existing type label',
      activitySubTypeLabel: 'Existing subtype label'
    })

    expect(result.activityTypeLabel).toBe('Existing type label')
    expect(result.activitySubTypeLabel).toBe('Existing subtype label')
  })

  test('normalises a single selection string and skips empty selections', () => {
    const result = snapshotActivityLabels({
      activityType: 'construction',
      activities: {
        selections: 'CON1'
      }
    })

    expect(result.activities.selections).toEqual(['CON1'])
    expect(result.activities.selectionLabels).toEqual([
      'Aquaculture trestles or fixed walkways'
    ])

    const emptySelections = snapshotActivityLabels({
      activities: { selections: undefined }
    })

    expect(emptySelections.activities.selections).toEqual([])
    expect(emptySelections.activities.selectionLabels).toEqual([])
  })

  test('omits activity labels when type or subtype are missing', () => {
    const result = snapshotActivityLabels({
      activities: { selections: ['CON1'] }
    })

    expect(result.activityTypeLabel).toBeUndefined()
    expect(result.activitySubTypeLabel).toBeUndefined()
    expect(result.activities.selectionLabels).toEqual([
      'Aquaculture trestles or fixed walkways'
    ])
  })

  test('skips activities when not a plain object', () => {
    const result = snapshotActivityLabels({
      activityType: 'construction',
      activities: 'invalid'
    })

    expect(result.activities).toBe('invalid')
    expect(result.activityTypeLabel).toBe(ACTIVITY_TYPE_LABELS.construction)
  })

  test('formats other selection with free text', () => {
    expect(
      resolveSelectionLabel('other', 'construction', 'Custom structure')
    ).toBe('Other structures: Custom structure')
  })

  test('resolveSelectionLabel falls back to selection key then null', () => {
    expect(resolveSelectionLabel('UNKNOWN_CODE', 'construction')).toBe(
      'UNKNOWN_CODE'
    )
    expect(resolveSelectionLabel(undefined, 'construction')).toBeNull()
  })

  test('resolveActivityTypeLabel returns null for unknown type', () => {
    expect(resolveActivityTypeLabel('unknown')).toBeNull()
  })

  test('snapshotSiteActivityLabels maps all activities', () => {
    const site = snapshotSiteActivityLabels({
      siteName: 'Site 1',
      activityDetails: [
        {
          activityType: 'deposit',
          activitySubType: 'deposit-type-2',
          activities: { selections: ['DEP11'] }
        }
      ]
    })

    expect(site.activityDetails[0].activityTypeLabel).toBe(
      ACTIVITY_TYPE_LABELS.deposit
    )
    expect(site.activityDetails[0].activities.selectionLabels).toEqual([
      'Pontoons'
    ])
  })

  test('snapshotSiteActivityLabels leaves non-array activityDetails unchanged', () => {
    const site = {
      siteName: 'Site 1',
      activityDetails: { description: 'Test activity' }
    }

    expect(snapshotSiteActivityLabels(site)).toEqual(site)
  })

  test('snapshotSiteActivityLabels returns site when activityDetails is missing', () => {
    const site = { siteName: 'Site 1' }

    expect(snapshotSiteActivityLabels(site)).toEqual(site)
    expect(snapshotSiteActivityLabels()).toEqual({})
  })
})
