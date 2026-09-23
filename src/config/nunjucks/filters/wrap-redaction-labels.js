import nunjucks from 'nunjucks'
import { wrapRedactionLabels } from '#src/server/common/helpers/marine-licence/redaction-label.js'

export function wrapRedactionLabelsFilter(value) {
  return new nunjucks.runtime.SafeString(wrapRedactionLabels(value))
}
