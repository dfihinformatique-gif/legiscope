import { dbConnect } from "$lib/server/db-connect"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.locals.sql) {
		const sql = await dbConnect()
		event.locals = { sql }
	}
	return await resolve(event)
}
