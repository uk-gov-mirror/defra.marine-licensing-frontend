// Wreck rejects on any 4xx/5xx, tagging the error with the upstream response.
// A transport failure (DNS, connection refused, timeout) is boomified too, but
// without isResponseError - so this distinguishes "the API answered badly" from
// "we never got an answer".
export const getUpstreamStatusCode = (error) =>
  error?.data?.isResponseError ? error.data.res?.statusCode : undefined
