import { error, json } from "@sveltejs/kit"
// import type { LegiArticle } from "@tricoteuses/legifrance"
import type { Legiarti } from "$lib/db_data_types"
import type { RequestHandler } from "../$types"

interface queryFirstArticle {
	premier_article_id: string
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const { article: requestedArticle, date: requestedDate } = params as {
		article: string
		date: string
	}
	const { sql } = locals
	const output: {
		article: Legiarti | undefined
		text: string | undefined
		textTitle: string | undefined
	} = {
		article: undefined,
		text: undefined,
		textTitle: undefined,
	}
	const dbConnection = await sql.reserve()
	let articleFromDb: Legiarti[] = []
	if (requestedArticle.startsWith("LEGITEXT")) {
		const [firstArticle]: [queryFirstArticle?] =
			await dbConnection<queryFirstArticle>`
			with valid_sections as
			(
			select scta1.*
			from scta scta1
			where subltree(chemin, 0, 1) = ${requestedArticle}
			and ${requestedDate}::date <@ scta1.parents_valid_period
			),
			invalid_sections as
			(
			select scta1.*
			from scta scta1
			where subltree(chemin, 0, 1) = ${requestedArticle}
			and ${requestedDate}::date between date_debut and date_fin
			and scta1.type_objet ='art'
			)
			select dernier_segment as premier_article_id from
			(
			select *, row_number() over (partition by type_objet order by tri_hierarchique) rn
			from
				(
				select *, 0 as invalid_sections
				from valid_sections
				union
					(
					select invalids.*
					from
						(
						select ivs.*, row_number() over (partition by ivs.dernier_segment order by date_debut) invalid_sections
						from invalid_sections ivs
						where not exists (select null from valid_sections vs where vs.dernier_segment = ivs.dernier_segment)
						) invalids
					where invalid_sections = 1
					)
				)
			)
			where rn=1 and type_objet='art'
			limit 1`

		if (
			firstArticle !== undefined &&
			firstArticle.premier_article_id.startsWith("LEGIARTI")
		) {
			const query = `select *
				from legiarti
				where legi_id='${firstArticle.premier_article_id}'`
			articleFromDb = await dbConnection<Legiarti>(query)
		} else {
			error(
				404,
				`First article found is not LEGIARTI or first article not found.`,
			)
		}
	} else if (requestedArticle.startsWith("LEGIARTI")) {
		const associatedText = await dbConnection<JSON>`
		select distinct subltree(s.chemin, 0,1) as associated_text
		from scta s
		where dernier_segment = ${requestedArticle}
		and '2024-10-10'::date <@ s.parents_valid_period`

		if (associatedText.length === 1) {
			output.text = associatedText[0].associated_text
			output.textTitle = associatedText[0].titre ?? associatedText[0].titre_full
		} else if (associatedText.length === 0) {
			error(
				422,
				`No text associated to ${requestedArticle} for date ${requestedDate} has been found.`,
			)
		} else {
			error(
				422,
				`Many texts are associated to ${requestedArticle} for date ${requestedDate}`,
			)
		}

		articleFromDb = await dbConnection<JSON>`select *
				from legiarti
				where legi_id=${requestedArticle}`
	}

	const textTitle = await dbConnection<string>`
	select coalesce(titre, titre_full) as titre from legitext
	where legi_id = ${output.text}
	`
	output.textTitle = textTitle[0].titre

	dbConnection.release()

	if (articleFromDb.length === 1) {
		output.article = articleFromDb[0]
		return json(output)
	} else if (articleFromDb.length === 0) {
		error(404, `Article not found`)
	} else {
		error(422, `Error : article ID refers to multiple articles`)
	}
}
