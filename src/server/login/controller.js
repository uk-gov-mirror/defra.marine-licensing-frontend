export async function loginController(request, h) {
  const { profile, token, refreshToken, expiresIn } = request.auth.credentials

  await request.server.app.cache.set(request.state.session, {
    profile,
    accessToken: token,
    refreshToken,
    expiresIn
  })
  return h.redirect('/')
}
