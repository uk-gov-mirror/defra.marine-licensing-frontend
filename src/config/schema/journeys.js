export const journeysSchema = {
  mcms: {
    url: {
      doc: 'Base URL of the MCMS service the IAT hands users off to at the end of a journey',
      format: String,
      default: 'https://marinelicensingtest.marinemanagement.org.uk/',
      env: 'MCMS_URL'
    },
    path: {
      doc: 'Path appended to the MCMS base URL for the IAT handoff — relative, no leading slash',
      format: String,
      default: 'mmofox5uat/fox/mmo/MMO_IAT_INTEGRATION',
      env: 'MCMS_PATH'
    }
  },
  survey: {
    exemption: {
      midJourneyUrl: {
        doc: 'Mid-journey feedback survey linked from the service banner on exemption screens',
        format: String,
        default:
          'https://forms.office.com/pages/responsepage.aspx?id=UCQKdycCYkyQx044U38RAjXEiYXnHG1DvkWr_VjRfzZUNERIRURNOFNVT0tXSlo1NUdONUYxQjNKUy4u&route=shorturl',
        env: 'SURVEY_EXEMPTION_MID_JOURNEY_URL'
      },
      confirmationUrl: {
        doc: 'End-of-journey feedback survey linked from the exemption confirmation page',
        format: String,
        default:
          'https://forms.office.com/pages/responsepage.aspx?id=UCQKdycCYkyQx044U38RAjXEiYXnHG1DvkWr_VjRfzZURFMxRkhCSzQyVlRKQzdZNDEyVDhSMFdSNy4u&route=shorturl',
        env: 'SURVEY_EXEMPTION_CONFIRMATION_URL'
      }
    },
    marineLicence: {
      midJourneyUrl: {
        doc: 'Mid-journey feedback survey linked from the service banner on marine licence screens',
        format: String,
        default: 'https://forms.cloud.microsoft/e/MHPbixhs4i',
        env: 'SURVEY_MARINE_LICENCE_MID_JOURNEY_URL'
      },
      confirmationUrl: {
        doc: 'End-of-journey feedback survey linked from the marine licence confirmation page',
        format: String,
        default: 'https://forms.cloud.microsoft/e/vUT96ZvAez',
        env: 'SURVEY_MARINE_LICENCE_CONFIRMATION_URL'
      }
    }
  },
  marineLicence: {
    enabled: {
      doc: 'Enable the Marine Licence journey',
      format: Boolean,
      default: false,
      env: 'ENABLE_MARINE_LICENCE'
    }
  },
  selfService: {
    enabled: {
      doc: 'Enable the Self Service IAT journey',
      format: Boolean,
      default: false,
      env: 'ENABLE_SELF_SERVICE'
    },
    dataQualityEnabled: {
      doc: 'Enable IAT data-quality scan and warning logs at server startup',
      format: Boolean,
      default: false,
      env: 'ENABLE_IAT_DATA_QUALITY'
    }
  }
}
