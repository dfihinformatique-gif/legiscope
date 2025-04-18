import { dbConnection } from "$lib/server/db-connect"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	const db = await dbConnection()
	event.locals = { db }
	return await resolve(event)
}
