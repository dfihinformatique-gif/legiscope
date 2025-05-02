import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, locals }) => {
	const { article } = params as { article: string }
	const { sql } = locals
	const articleTxtFromDb: JSON[] = await sql<JSON>`
		select data
		from article
		where id=${article}`

	if (articleTxtFromDb.length === 1) {
		const data = json(articleTxtFromDb[0].data)
		return data
	} else if (articleTxtFromDb.length === 0) {
		error(404, `Article not found`)
	} else {
		error(422, `Error : article ID refers to multiple articles`)
	}
}
