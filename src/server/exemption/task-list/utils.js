import { routes } from '#src/server/common/constants/routes.js'
const setStatus = (task) => {
  if (!task) {
    return {
      tag: {
        text: 'Incomplete',
        classes: 'govuk-tag--blue'
      }
    }
  }

  return {
    text: 'Completed'
  }
}
export const transformTaskList = (taskList) => {
  return [
    {
      title: {
        text: 'Project name'
      },
      href: routes.PROJECT_NAME,
      status: setStatus(taskList.projectName)
    },
    {
      title: {
        text: 'Activity dates'
      },
      href: routes.ACTIVITY_DATES,
      status: setStatus(taskList.activityDates)
    },
    {
      title: {
        text: 'Activity description'
      },
      href: routes.ACTIVITY_DESCRIPTION,
      status: setStatus(taskList.activityDescription)
    },
    {
      title: {
        text: 'Site details'
      },
      href: taskList.siteDetails
        ? routes.REVIEW_SITE_DETAILS
        : routes.SITE_DETAILS,
      status: setStatus(taskList.siteDetails)
    },
    {
      title: {
        text: 'Public register'
      },
      href: routes.PUBLIC_REGISTER,
      status: setStatus(taskList.publicRegister)
    }
  ]
}
