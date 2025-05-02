import { error, json } from "@sveltejs/kit"
import type { LegiArticle } from "@tricoteuses/legifrance"
import type { RequestHandler } from "./$types"

interface dataArticle {
	data: LegiArticle
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const { article } = params as { article: string }
	const { sql } = locals
	const articleTxtFromDb: dataArticle[] = await sql<JSON>`
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
