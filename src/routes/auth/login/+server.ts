import jwt from "jsonwebtoken"
import {
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomPKCECodeVerifier,
  randomState,
} from "openid-client"

import serverConfig from "$lib/server/config"

import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
  const { openIdConnectConfiguration } = locals
  if (openIdConnectConfiguration !== undefined) {
    // PKCE: The following MUST be generated for every redirect to the
    // authorization_endpoint. You must store the codeVerifier and state in the
    // end-user session such that it can be recovered as the user gets redirected
    // from the authorization server back to your application.
    //
    const pkceCodeVerifier: string = randomPKCECodeVerifier()
    const parameters: Record<string, string> = {
      redirect_uri: new URL("auth/login_callback", url.origin).toString(),
      scope: "openid email profile roles",
      code_challenge: await calculatePKCECodeChallenge(pkceCodeVerifier),
      code_challenge_method: "S256",
    }

    let state: string | undefined = undefined
    if (!openIdConnectConfiguration.serverMetadata().supportsPKCE()) {
      // We cannot be sure the server supports PKCE so we're going to use state too.
      // Use of PKCE is backwards compatible even if the AS doesn't support it which
      // is why we're using it regardless. Like PKCE, random state must be generated
      // for every redirect to the authorization_endpoint.
      state = randomState()
      parameters.state = state
    }

    const authorizationUrl: URL = buildAuthorizationUrl(
      openIdConnectConfiguration,
      parameters,
    )

    cookies.set(
      "signin",
      jwt.sign({ pkceCodeVerifier, state }, serverConfig.jwtSecret, {
        expiresIn: "1h",
      }),
      {
        httpOnly: true,
        path: "/",
        sameSite: "none", // Same-Site must be set to none, otherwise cookie will not be available.
        secure: true,
      },
    )
    return new Response(`Redirecting to ${authorizationUrl}…`, {
      status: 302,
      headers: { location: authorizationUrl.toString() },
    })
  }

  console.error(`No authentication method defined`)
  return new Response("No authentication method defined", {
    status: 302,
    headers: { location: "/" },
  })
}
