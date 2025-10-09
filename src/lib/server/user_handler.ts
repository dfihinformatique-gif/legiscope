import type { Handle } from "@sveltejs/kit"
import jwt from "jsonwebtoken"

import serverConfig from "$lib/server/config"
import type { User } from "$lib/users"

export interface UserLocals {
  user?: User
}

export const userHandler: Handle = async ({ event, resolve }) => {
  const { cookies, locals } = event

  const idTokenJwt = cookies.get("id_token")
  if (idTokenJwt !== undefined) {
    try {
      locals.id_token = (
        jwt.verify(idTokenJwt, serverConfig.jwtSecret) as { id_token: string }
      ).id_token
    } catch (e) {
      console.warn(`Invalid JSON Web Token for id_token: ${idTokenJwt}. ${e}`)
      cookies.delete("id_token", { path: "/" })
    }
  }

  const userJwt = cookies.get("user")
  if (userJwt !== undefined) {
    try {
      locals.user = jwt.verify(userJwt, serverConfig.jwtSecret) as User
    } catch (e) {
      console.warn(`Invalid JSON Web Token for user: ${userJwt}. ${e}`)
      cookies.delete("user", { path: "/" })
    }
  }
  return await resolve(event)
}
