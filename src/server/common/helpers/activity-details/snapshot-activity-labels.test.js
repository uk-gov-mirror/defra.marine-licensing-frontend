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

  test('formats other selection with free text', () => {
    expect(
      resolveSelectionLabel('other', 'construction', 'Custom structure')
    ).toBe('Other structures: Custom structure')
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
})
