import type { Handle } from "@sveltejs/kit"
import { Configuration, discovery } from "openid-client"

import serverConfig from "$lib/server/config"

export interface OpenIdConnectLocals {
  openIdConnectConfiguration?: Configuration
}

const { openIdConnect } = serverConfig

export const openIdConnectHandler: Handle = async ({ event, resolve }) => {
  if (openIdConnect !== undefined) {
    if (event.locals.openIdConnectConfiguration === undefined) {
      event.locals.openIdConnectConfiguration = await discovery(
        new URL(openIdConnect.issuerUrl),
        openIdConnect.clientId,
        openIdConnect.clientSecret,
      )
      event.locals.openIdConnectConfiguration.timeout = 10000 // 10 s
    }
  }

  return await resolve(event)
}
