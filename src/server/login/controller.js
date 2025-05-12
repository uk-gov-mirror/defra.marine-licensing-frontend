export async function loginController(request, h) {
  const { profile } = request.auth.credentials

  await request.server.app.cache.set(request.state.session, { profile })
  return h.redirect('/')
}
