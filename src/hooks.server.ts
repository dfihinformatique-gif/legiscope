import { getDbPool } from "$lib/server/db-connect"
import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"

import { csrfHandler } from "$lib/server/csrf_handler"
import { openIdConnectHandler } from "$lib/server/openid_connect_handler"
import { userHandler } from "$lib/server/user_handler"

export const handle: Handle = sequence(
	csrfHandler(["/auth/login_callback", "/auth/logout_callback"]),
	userHandler,
	openIdConnectHandler,
	async ({ event, resolve }) => {
		if (!event.locals.sql) {
			event.locals.sql = await getDbPool()
		}
		return await resolve(event)
	},
)
