import { dbConnection } from "$lib/server/db-connect"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	const sql = await dbConnection()
	event.locals = { sql }
	return await resolve(event)
}
