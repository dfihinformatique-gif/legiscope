import serverConfig from "$lib/server/config"
import type { User } from "$lib/users"

import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async (
  event,
): Promise<{
  authenticationEnabled: boolean
  user?: User
}> => {
  const { locals } = event
  const { user } = locals
  return {
    authenticationEnabled: serverConfig.openIdConnect !== undefined,
    user,
  }
}
