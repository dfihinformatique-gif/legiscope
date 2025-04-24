import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, locals }) => {
	const { article } = params as { article: string }
	const { sql } = locals
	const test: JSON = await sql<JSON>`
		select data
		from article
		where id=${article}`

	return json(test)
}
