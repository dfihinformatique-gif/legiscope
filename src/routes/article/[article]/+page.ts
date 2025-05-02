import type { LegiArticle } from "@tricoteuses/legifrance"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({
	fetch,
	params,
}): Promise<{ article: LegiArticle | null }> => {
	const article = params.article

	if (article !== undefined) {
		const res = await fetch(`/api/article/${article}`, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=utf-8",
			},
			method: "GET",
		})
		if (!res.ok) {
			console.error(`Error ${res.status} while retrieving article content.}`)
			return { article: null }
		} else {
			const articleJson: LegiArticle = await res.json()
			return { article: articleJson }
		}
	}
	return { article: null }
}
