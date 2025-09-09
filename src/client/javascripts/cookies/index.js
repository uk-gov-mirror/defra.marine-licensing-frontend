export class CookieSettings {
  constructor(element) {
    this.form = element
    this.analyticsRadios = this.form.querySelectorAll('input[name="analytics"]')

    if (this.form) {
      this.form.addEventListener('submit', this.handleSubmit.bind(this))
    }
  }

  handleSubmit() {
    const selectedRadio = this.form.querySelector(
      'input[name="analytics"]:checked'
    )

    if (
      selectedRadio &&
      window.clarity &&
      typeof window.clarity === 'function'
    ) {
      const consentValue = selectedRadio.value === 'yes'

      try {
        window.clarity('consent', consentValue)
      } catch {
        // Silently handle Clarity consent errors
      }
    }
  }
}
