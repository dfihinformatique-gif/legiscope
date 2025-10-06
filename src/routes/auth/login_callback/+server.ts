import { error } from "@sveltejs/kit"
import jwt from "jsonwebtoken"
import { authorizationCodeGrant } from "openid-client"

import serverConfig from "$lib/server/config"
import type { SigninPayload } from "$lib/users"

import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
  const { openIdConnectConfiguration } = locals
  if (openIdConnectConfiguration === undefined) {
    console.error(`No authentication method defined`)
    return new Response("No authentication method defined", {
      status: 302,
      headers: { location: "/" },
    })
  }

  const signinJwt = cookies.get("signin")
  cookies.delete("signin", { path: "/" })
  if (signinJwt === undefined) {
    console.warn(`Authentication failed: Missing signin cookie`)
    return new Response(`Authentication failed: Missing signin cookie.`, {
      status: 302,
      headers: { location: "/" },
    })
  }
  let signinPayload: SigninPayload
  try {
    signinPayload = jwt.verify(
      signinJwt,
      serverConfig.jwtSecret,
    ) as SigninPayload
  } catch (e) {
    console.error(`Invalid JSON Web Token: ${signinJwt}. ${e}`)
    error(401, `Invalid JSON Web Token`)
  }

  const tokens = await authorizationCodeGrant(openIdConnectConfiguration, url, {
    pkceCodeVerifier: signinPayload.pkceCodeVerifier,
    expectedState: signinPayload.state,
  })

  const user = { ...tokens.claims() }
  delete user.exp
  delete user.iat

  const decodedAccessToken = jwt.decode(tokens.access_token) as {
    realm_access?: {
      roles?: string[]
    }
  }
  if (decodedAccessToken.realm_access?.roles !== undefined) {
    user.roles = decodedAccessToken.realm_access.roles
  }

  if (tokens.id_token !== undefined) {
    cookies.set(
      "id_token",
      jwt.sign({ id_token: tokens.id_token }, serverConfig.jwtSecret, {
        expiresIn: "1w",
      }),
      {
        httpOnly: true,
        path: "/",
        secure: true,
      },
    )
  }
  cookies.set(
    "user",
    jwt.sign(user, serverConfig.jwtSecret, { expiresIn: "1w" }),
    {
      httpOnly: true,
      path: "/",
      secure: true,
    },
  )

  const redirectUrl = new URL(`/`, url.origin).toString()
  return new Response(`Redirecting to ${redirectUrl}…`, {
    status: 302,
    headers: {
      location: redirectUrl,
    },
  })
}
