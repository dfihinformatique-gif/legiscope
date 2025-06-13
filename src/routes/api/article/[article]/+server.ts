import { error, json } from "@sveltejs/kit"
import type { LegiArticle } from "@tricoteuses/legifrance"
import type { RequestHandler } from "./$types"

interface queryDataArticle {
	data: LegiArticle
}

interface queryFirstArticle {
	premier_article_id: string
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const { article: requestedArticle } = params as { article: string }
	const { sql } = locals
	const dbConnection = await sql.reserve()
	let articleTxtFromDb: queryDataArticle[] = []

	if (requestedArticle.startsWith("LEGITEXT")) {
		const [firstArticle]: [queryFirstArticle?] =
			await dbConnection<queryFirstArticle>`
			WITH RECURSIVE section_hierarchy AS (
			SELECT
					element->>'@id' as section_id,
					ARRAY[ordinality] as path_array,
					1 as depth
			FROM textelr,
					jsonb_array_elements(data->'STRUCT'->'LIEN_SECTION_TA')
					WITH ORDINALITY as t(element, ordinality)
			WHERE element->>'@etat' = 'VIGUEUR'
				AND id = ${requestedArticle}

			UNION ALL
			SELECT
					sub_element->>'@id' as section_id,
					sh.path_array || sub_ordinality::int as path_array,
					sh.depth + 1
			FROM section_hierarchy sh
			JOIN section_ta st ON st.id = sh.section_id
			CROSS JOIN jsonb_array_elements(st.data->'STRUCTURE_TA'->'LIEN_SECTION_TA')
			WITH ORDINALITY as sub_t(sub_element, sub_ordinality)
			WHERE sub_element->>'@etat' = 'VIGUEUR'
				AND sh.depth < 10
				AND st.data @? '$.STRUCTURE_TA.LIEN_SECTION_TA[*] ? (@."@etat" == "VIGUEUR")'
			)
			SELECT
					st.data #>> '{STRUCTURE_TA,LIEN_ART,0,@id}' as premier_article_id
			FROM section_hierarchy sh
			JOIN section_ta st ON st.id = sh.section_id
			WHERE st.data @? '$.STRUCTURE_TA.LIEN_ART[0] ? (@."@etat" == "VIGUEUR")'
			ORDER BY sh.path_array
			LIMIT 1;`

		articleTxtFromDb = await dbConnection<JSON>`
		select data
		from article
		where id=${firstArticle?.premier_article_id}`
	} else if (requestedArticle.startsWith("LEGIARTI")) {
		articleTxtFromDb = await dbConnection<JSON>`
		select data
		from article
		where id=${requestedArticle}`
	}

	dbConnection.release()

	if (articleTxtFromDb.length === 1) {
		const data = json(articleTxtFromDb[0].data)
		return data
	} else if (articleTxtFromDb.length === 0) {
		error(404, `Article not found`)
	} else {
		error(422, `Error : article ID refers to multiple articles`)
	}
}
