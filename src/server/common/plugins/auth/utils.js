export const getUserSession = async (request, session) => {
  return session.sessionId
    ? await request.server.app.cache.get(session.sessionId)
    : null
}

export const removeUserSession = (request, session) => {
  request.server.app.cache.drop(session.sessionId)
  request.cookieAuth.clear()
}
