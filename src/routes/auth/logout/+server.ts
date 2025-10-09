import { buildEndSessionUrl } from "openid-client"

import type { RequestHandler } from "./$types"

export const GET: RequestHandler = ({ cookies, locals, url }) => {
  cookies.delete("id_token", { path: "/" })
  cookies.delete("user", { path: "/" })
  const idToken = locals.id_token
  delete locals.id_token
  delete locals.user

  if (idToken === undefined) {
    return new Response(`Redirecting to ${url.origin}…`, {
      status: 302,
      headers: { location: url.origin },
    })
  }

  const { openIdConnectConfiguration } = locals
  if (openIdConnectConfiguration !== undefined) {
    const endSessionUrl = buildEndSessionUrl(openIdConnectConfiguration, {
      id_token_hint: idToken,
      post_logout_redirect_uri: new URL(
        "auth/logout_callback",
        url.origin,
      ).toString(),
    })
    return new Response(`Redirecting to ${endSessionUrl}…`, {
      status: 302,
      headers: { location: endSessionUrl.toString() },
    })
  }

  console.error(`No authentication method defined`)
  return new Response("No authentication method defined", {
    status: 302,
    headers: { location: "/" },
  })
}
