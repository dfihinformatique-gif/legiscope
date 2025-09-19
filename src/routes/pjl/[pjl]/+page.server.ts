import type { ArticleInfo, Legiarti } from "$lib/db_data_types"
import { getDbPool } from "$lib/server/db-connect"
import { shared } from "$lib/shared.svelte"
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

async function getArticle(
	requestedArticle: string,
	requestedDate: string,
): Promise<ArticleInfo> {
	const output: ArticleInfo = {
		article: undefined,
		text: undefined,
		textTitle: undefined,
		versions: undefined,
	}

	const sql = await getDbPool()
	const dbConnection = await sql.reserve()

	try {
		let articleFromDb: Legiarti[] = []

		if (requestedArticle.startsWith("LEGITEXT")) {
			output.text = requestedArticle
			const [firstArticle] = await dbConnection`
				with valid_sections as (
					select scta1.*
					from scta scta1
					where subltree(chemin, 0, 1) = ${requestedArticle}
					and ${requestedDate}::date <@ scta1.parents_valid_period
				),
				invalid_sections as (
					select scta1.*
					from scta scta1
					where subltree(chemin, 0, 1) = ${requestedArticle}
					and ${requestedDate}::date between date_debut and date_fin
					and scta1.type_objet = 'art'
				)
				select dernier_segment as premier_article_id from (
					select *, row_number() over (partition by type_objet order by tri_hierarchique) rn
					from (
						select *, 0 as invalid_sections
						from valid_sections
						union (
							select invalids.*
							from (
								select ivs.*, row_number() over (partition by ivs.dernier_segment order by date_debut) invalid_sections
								from invalid_sections ivs
								where not exists (select null from valid_sections vs where vs.dernier_segment = ivs.dernier_segment)
							) invalids
							where invalid_sections = 1
						)
					)
				)
				where rn = 1 and type_objet = 'art'
				limit 1`

			if (firstArticle?.premier_article_id?.startsWith("LEGIARTI")) {
				articleFromDb = await dbConnection`
					select *
					from legiarti
					where legi_id = ${firstArticle.premier_article_id}::text`
			} else {
				throw error(
					404,
					"First article found is not LEGIARTI or first article not found.",
				)
			}
		} else if (requestedArticle.startsWith("JORFTEXT")) {
			output.text = requestedArticle
			const [firstArticle] = await dbConnection`
				select dernier_segment as premier_article_id from (
					select *, row_number() over (partition by type_objet order by tri_hierarchique) rn
					from scta
					where subltree(chemin, 0, 1) = ${requestedArticle}
				)
				where rn = 1 and type_objet = 'art'
				limit 1`

			if (firstArticle?.premier_article_id?.startsWith("JORFARTI")) {
				articleFromDb = await dbConnection`
					select *
					from jorfarti
					where legi_id = ${firstArticle.premier_article_id}::text`
			} else {
				throw error(
					404,
					"First article found is not JORFARTI or first article not found.",
				)
			}
		} else if (requestedArticle.startsWith("LEGIARTI")) {
			const associatedText = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}
				and ${requestedDate}::date <@ s.parents_valid_period`

			if (associatedText.length === 1) {
				output.text = associatedText[0].associated_text
			} else if (associatedText.length === 0) {
				throw error(
					422,
					`No text associated to ${requestedArticle} for date ${requestedDate} has been found.`,
				)
			} else {
				throw error(
					422,
					`Many texts are associated to ${requestedArticle} for date ${requestedDate}`,
				)
			}

			articleFromDb = await dbConnection`
				select *
				from legiarti
				where legi_id = ${requestedArticle}`
		} else if (requestedArticle.startsWith("JORFARTI")) {
			const associatedText = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}`

			if (associatedText.length === 1) {
				output.text = associatedText[0].associated_text
			} else if (associatedText.length === 0) {
				throw error(
					422,
					`No text associated to ${requestedArticle} for date ${requestedDate} has been found.`,
				)
			} else {
				throw error(
					422,
					`Many texts are associated to ${requestedArticle} for date ${requestedDate}`,
				)
			}

			articleFromDb = await dbConnection`
				select *
				from jorfarti
				where legi_id = ${requestedArticle}`
		} else if (requestedArticle.startsWith("LEGISCTA")) {
			const associatedText = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}
				and ${requestedDate}::date <@ s.parents_valid_period`

			if (associatedText.length === 1) {
				output.text = associatedText[0].associated_text
			} else if (associatedText.length === 0) {
				throw error(
					422,
					`No text associated to ${requestedArticle} for date ${requestedDate} has been found.`,
				)
			} else {
				throw error(
					422,
					`Many texts are associated to ${requestedArticle} for date ${requestedDate}`,
				)
			}

			const [firstArticle] = await dbConnection`
				with target_date as (
					select ${requestedDate}::date as ref_date
				),
				valid_articles as (
					select
						dernier_segment,
						tri_hierarchique,
						1 as priority
					from scta, target_date
					where chemin ~ ${"*." + requestedArticle + ".*"}
					and type_objet = 'art'
					and ref_date <@ parents_valid_period
				),
				invalid_articles as (
					select distinct on (dernier_segment)
						dernier_segment,
						tri_hierarchique,
						2 as priority
					from scta, target_date
					where chemin ~ ${"*." + requestedArticle + ".*"}
					and type_objet = 'art'
					and ref_date between date_debut and date_fin
					and not exists (
						select 1 from valid_articles va
						where va.dernier_segment = scta.dernier_segment
					)
					order by dernier_segment, date_debut
				),
				all_articles as (
					select * from valid_articles
					union all
					select * from invalid_articles
				)
				select dernier_segment as premier_article_id
				from all_articles
				order by priority, tri_hierarchique
				limit 1`

			if (firstArticle?.premier_article_id?.startsWith("LEGIARTI")) {
				articleFromDb = await dbConnection`
					select *
					from legiarti
					where legi_id = ${firstArticle.premier_article_id}::text`
			} else {
				throw error(
					404,
					"First article found is not LEGIARTI or first article not found.",
				)
			}
		}

		// Récupération des versions
		const versionsResult: {
			legi_id_lien: string
			debut: string
			fin: string
		}[] = await dbConnection`
			select legi_id_lien, debut, fin
			from versions
			where legi_id = ${requestedArticle}
			order by debut`
		output.versions = versionsResult

		// Récupération du titre du texte
		if (output.text) {
			const textTitle = await dbConnection`
				select coalesce(titre, titre_full) as titre
				from (
					select legi_id, titre, titre_full from legitext
					union
					select legi_id, titre, titre_full from jorftext
				)
				where legi_id = ${output.text}`

			if (textTitle.length > 0) {
				output.textTitle = textTitle[0].titre
			}
		}

		// Traitement de l'article trouvé
		if (articleFromDb.length === 1) {
			const article = articleFromDb[0]
			article.date_debut = new Date(article.date_debut)
				.toISOString()
				.split("T")[0]
			article.date_fin = new Date(article.date_fin).toISOString().split("T")[0]
			output.article = article
			return output
		} else if (articleFromDb.length === 0) {
			throw error(404, "Article not found")
		} else {
			throw error(422, "Error: article ID refers to multiple articles")
		}
	} finally {
		dbConnection.release()
	}
}

export const load: PageServerLoad = async ({
	url,
}): Promise<{
	articleInfoPromise: Promise<ArticleInfo> | undefined
}> => {
	const lawArticle = url.searchParams.get("lawArticle")
	try {
		if (lawArticle) {
			return { articleInfoPromise: getArticle(lawArticle, shared.pjlDate) }
		} else {
			return {
				articleInfoPromise: undefined,
			}
		}
	} catch (error) {
		console.error("Error:", error)
		return {
			articleInfoPromise: undefined,
		}
	}
}
