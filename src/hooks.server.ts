import { getDbPool } from "$lib/server/db-connect"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.locals.sql) {
		event.locals.sql = await getDbPool()
	}
	return await resolve(event)
}
