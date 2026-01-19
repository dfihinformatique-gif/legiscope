import type { ArticleInfo, HistoryData, Legiarti } from "$lib/db_data_types"
import { getDbPool } from "$lib/server/db-connect"
import { shared } from "$lib/shared.svelte"
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

function getPreviousLegiIdLien(
	versionsResult: Array<{
		legi_id_lien: string
		debut: string
		fin: string
	}>,
	targetDebut: string,
): string | undefined {
	const previousVersions = versionsResult.filter(
		(version) => version.debut < targetDebut,
	)

	if (previousVersions.length === 0) {
		return undefined
	}
	const previousVersion = previousVersions[0]

	return previousVersion.legi_id_lien
}

async function getArticle(
	requestedArticle: string,
	requestedDate: string,
): Promise<ArticleInfo | undefined> {
	const output: ArticleInfo = {
		article: undefined,
		articlePreviousVersion: undefined,
		historyLinks: undefined,
		text: undefined,
		textTitle: undefined,
		sectionTitle: undefined,
		jorfTextDatePubli: undefined,
		versions: undefined,
	}

	const sql = await getDbPool()
	const dbConnection = await sql.reserve()

	try {
		let articleFromDb: Legiarti[] = []
		let previousVersionArticleFromDb: Legiarti[] = []

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
					select l.id, coalesce(acal.bloc_textuel, l.bloc_textuel) bloc_textuel, l.legi_id, l.date_debut, l.date_fin, l.num, l.article_type, l.url, l.nota, l.etat
					from legiarti l
					left join article_contenu_avec_liens acal on (l.legi_id = acal.legi_id)
					where l.legi_id = ${firstArticle.premier_article_id}::text
					`
			} else {
				output.article = undefined
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
				select j.id, coalesce(acal.bloc_textuel, j.bloc_textuel) bloc_textuel, j.legi_id, j.date_debut, j.date_fin, j.num, j.article_type, j.url
				from jorfarti j
				left join article_contenu_avec_liens acal on (j.legi_id = acal.legi_id)
				where j.legi_id = ${firstArticle.premier_article_id}::text
				`
			} else {
				output.article = undefined
			}
		} else if (requestedArticle.startsWith("LEGIARTI")) {
			const associatedText = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}
				and ${requestedDate}::date <@ s.parents_valid_period`

			if (associatedText.length === 1) {
				output.text = associatedText[0].associated_text
				const lastSectionTitle = await dbConnection`
					select titre as section_title from scta s2 where s2.dernier_segment =
						(
						select distinct subpath(s.chemin, -2, 1)::text
						from scta s
						where dernier_segment = ${requestedArticle}
						and ${requestedDate}::date <@ s.parents_valid_period
						limit 1
						)
					`
				output.sectionTitle = lastSectionTitle[0]?.section_title ?? undefined
			} else if (associatedText.length === 0) {
				const associatedTextOutOfBoundaries = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}`

				if (associatedTextOutOfBoundaries.length === 1) {
					output.text = associatedTextOutOfBoundaries[0].associated_text
					const lastSectionTitle = await dbConnection`
					select titre as section_title from scta s2 where s2.dernier_segment =
						(
						select distinct subpath(s.chemin, -2, 1)::text
						from scta s
						where dernier_segment = ${requestedArticle}
						limit 1
						)
					`
					output.sectionTitle = lastSectionTitle[0]?.section_title ?? undefined
				} else if (associatedTextOutOfBoundaries.length > 1) {
					const refinedAssociatedTextOutOfBoundaries = await dbConnection`
						select distinct subltree(s.chemin, 0, 1) as associated_text
						from scta s
						where dernier_segment = ${requestedArticle}
						and exists (select null from legitext where ${requestedDate}::date between date_debut and date_fin and legi_id = subltree(s.chemin, 0, 1)::text)`

					if (refinedAssociatedTextOutOfBoundaries.length === 1) {
						const lastSectionTitle = await dbConnection`
							select titre as section_title from scta s2 where s2.dernier_segment =
								(
								select distinct subltree(s.chemin, 0, 1) as associated_text
								from scta s
								where dernier_segment = ${requestedArticle}
								and exists (select null from legitext where ${requestedDate}::date between date_debut and date_fin and legi_id = subltree(s.chemin, 0, 1)::text)
								)
							`
						output.sectionTitle = lastSectionTitle[0].section_title
						output.text =
							refinedAssociatedTextOutOfBoundaries[0].associated_text
					} else {
						throw error(
							422,
							`Could not find text associated to ${requestedArticle} for date ${requestedDate}`,
						)
					}
				} else {
					throw error(
						422,
						`No text associated to ${requestedArticle} for date ${requestedDate} has been found.`,
					)
				}
			} else {
				throw error(
					422,
					`Many texts are associated to ${requestedArticle} for date ${requestedDate}`,
				)
			}

			articleFromDb = await dbConnection`
				select l.id, coalesce(acal.bloc_textuel, l.bloc_textuel) bloc_textuel, l.legi_id, l.date_debut, l.date_fin, l.num, l.article_type, l.url, l.nota, l.etat
				from legiarti l
				left join article_contenu_avec_liens acal on (l.legi_id = acal.legi_id)
				where l.legi_id = ${requestedArticle}::text
				`
		} else if (requestedArticle.startsWith("JORFARTI")) {
			const associatedText = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}`

			if (associatedText.length === 1) {
				output.text = associatedText[0].associated_text
				const lastSectionTitle = await dbConnection`
					select titre as section_title from scta s2 where s2.dernier_segment =
						(
						select distinct subpath(s.chemin, -2, 1)::text
						from scta s
						where dernier_segment = ${requestedArticle}
						limit 1
						)
					`
				output.sectionTitle =
					lastSectionTitle[0]?.section_title ??
					associatedText[0].associated_text.titre
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
				select j.id, coalesce(acal.bloc_textuel, j.bloc_textuel) bloc_textuel, j.legi_id, j.date_debut, j.date_fin, j.num, j.article_type, j.url
				from jorfarti j
				left join article_contenu_avec_liens acal on (j.legi_id = acal.legi_id)
				where j.legi_id = ${requestedArticle}::text
				`
		} else if (requestedArticle.startsWith("LEGISCTA")) {
			const associatedText = await dbConnection`
				select distinct subltree(s.chemin, 0, 1) as associated_text
				from scta s
				where dernier_segment = ${requestedArticle}
				and ${requestedDate}::date <@ s.parents_valid_period`

			if (associatedText.length === 1) {
				output.text = associatedText[0].associated_text
				const lastSectionTitle = await dbConnection`
					select titre as section_title from scta s2 where s2.dernier_segment = ${requestedArticle}`
				output.sectionTitle = lastSectionTitle[0].section_title
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
				select l.id, coalesce(acal.bloc_textuel, l.bloc_textuel) bloc_textuel, l.legi_id, l.date_debut, l.date_fin, l.num, l.article_type, l.url, l.nota, l.etat
				from legiarti l
				left join article_contenu_avec_liens acal on (l.legi_id = acal.legi_id)
				where l.legi_id = ${firstArticle.premier_article_id}::text
				`
			} else {
				output.article = undefined
			}
		}

		// Récupération des versions
		const versionsResult:
			| {
					legi_id_lien: string
					debut: string
					fin: string
			  }[]
			| undefined =
			articleFromDb.length > 0
				? ((await dbConnection`
			select legi_id_lien, to_char(debut, 'YYYY-MM-DD') debut, to_char(fin, 'YYYY-MM-DD') fin
			from versions
			where legi_id = ${articleFromDb[0].legi_id}
			and (debut < fin or legi_id_lien like 'JORF%')
			order by debut desc`) as { legi_id_lien: string; debut: string; fin: string }[])
				: undefined
		output.versions = versionsResult

		const previousVersionId =
			articleFromDb.length > 0
				? getPreviousLegiIdLien(
						versionsResult!,
						new Date(articleFromDb[0].date_debut).toISOString().split("T")[0],
					)
				: undefined

		if (
			previousVersionId !== undefined &&
			previousVersionId.startsWith("LEGIARTI") &&
			articleFromDb[0].legi_id.startsWith("LEGIARTI")
		) {
			previousVersionArticleFromDb = await dbConnection`
			select l.id, coalesce(acal.bloc_textuel, l.bloc_textuel) bloc_textuel, l.legi_id, l.date_debut, l.date_fin, l.num, l.article_type, l.url, l.nota, l.etat
			from legiarti l
			left join article_contenu_avec_liens acal on (l.legi_id = acal.legi_id)
			where l.legi_id = ${previousVersionId}::text
			`
		} else if (
			previousVersionId !== undefined &&
			previousVersionId.startsWith("JORFARTI") &&
			articleFromDb[0].legi_id.startsWith("JORFARTI")
		) {
			previousVersionArticleFromDb = await dbConnection`
			select j.id, coalesce(acal.bloc_textuel, j.bloc_textuel) bloc_textuel, j.legi_id, j.date_debut, j.date_fin, j.num, j.article_type, j.url
			from jorfarti j
			left join article_contenu_avec_liens acal on (j.legi_id = acal.legi_id)
			where j.legi_id = ${previousVersionId}::text
			`
		}

		// Récupération du titre du texte et de la date de publication JO le cas échéant
		if (output.text) {
			const textTitle = await dbConnection`
				select regexp_replace(coalesce(titre, titre_full), '\\(1\\)\\s*$', '') as titre
				from (
					select legi_id, titre, titre_full from legitext
					union
					select legi_id, titre, titre_full from jorftext
				)
				where legi_id = ${output.text}`

			if (textTitle.length > 0) {
				output.textTitle = textTitle[0].titre
			}

			let jorfText: string | undefined = output.text
			if (!jorfText.startsWith("JORFTEXT")) {
				const jorfArti = output.versions?.filter((version) =>
					version.legi_id_lien.startsWith("JORF"),
				)[0]
				if (jorfArti !== undefined) {
					const jorfTextResults = await dbConnection`
					select distinct subltree(s.chemin, 0, 1) as associated_text
					from scta s
					where dernier_segment = ${jorfArti.legi_id_lien}`

					if (jorfTextResults.length > 0) {
						jorfText = jorfTextResults[0].associated_text
					} else {
						jorfText = undefined
					}
				}
			}
			if (jorfText !== undefined) {
				const jorfTextDatePubli = await dbConnection`
				select to_char(date_publi, 'YYYY-MM-DD') date_publi
				from jorftext
				where legi_id = ${jorfText}
				`
				if (jorfTextDatePubli.length === 1 && jorfTextDatePubli[0].date_publi) {
					output.jorfTextDatePubli = jorfTextDatePubli[0].date_publi
				}
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

			if (previousVersionArticleFromDb.length === 1) {
				const articlePreviousVersion = previousVersionArticleFromDb[0]
				articlePreviousVersion.date_debut = new Date(
					articlePreviousVersion.date_debut,
				)
					.toISOString()
					.split("T")[0]
				articlePreviousVersion.date_fin = new Date(
					articlePreviousVersion.date_fin,
				)
					.toISOString()
					.split("T")[0]
				output.articlePreviousVersion = articlePreviousVersion
			}

			const historyLinks: HistoryData = await dbConnection`
			with creat_modif as (
				select al.cidtexte, regexp_replace(jt.titre_full, '\\(1\\)\\s*$', '') titre_texte, jt.date_publi, al.legi_id_lien legi_id_lien_al, al.typelien, v_lien.legi_id_lien article_jorf, v_lien.num
				from articles_liens al
				left join versions v_lien on (v_lien.legi_id = al.legi_id_lien and v_lien.legi_id_lien like 'JORFARTI%')
				left join jorftext jt on (jt.legi_id = al.cidtexte)
				where al.legi_id = ${article.legi_id}
				and (al.typelien, al.cible) in
					(
						('CODIFICATION', false),
						('CODIFIE', true),
						('CREATION', false),
						('CREE', true),
						('MODIFICATION', false),
						('MODIFIE', true),
						('TRANSFERT', false),
						('TRANSFERE', true))
					)
			select distinct cm.cidtexte, cm.titre_texte, cm.article_jorf, num,
				case
				when typelien = 'CODIFIE' then 'CODIFICATION'
				when typelien = 'CREE' then 'CREATION'
				when typelien = 'MODIFIE' then 'MODIFICATION'
				when typelien = 'TRANSFERE' then 'TRANSFERT'
				else typelien
				end typelien, date_publi,
				case
					when typelien in ('CREATION', 'CREE', 'MODIFIE', 'MODIFICATION') then 1
					when typelien in ('CODIFICATION', 'CODIFIE', 'TRANSFERT', 'TRANSFERE') then 2
					else 3
				end ordinalite
			from creat_modif cm
			order by ordinalite`

			output.historyLinks = historyLinks

			return output
		} else if (articleFromDb.length === 0) {
			// throw error(404, "Article not found")
			output.article = undefined
			return undefined
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
	articleInfoPromise: Promise<ArticleInfo | undefined>
	citingArticleInfoPromise: Promise<ArticleInfo | undefined>
}> => {
	const lawArticle = url.searchParams.get("article")
	const citingLawArticle = url.searchParams.get("citant")
	const urlDate = url.searchParams.get("date")
	const requestedDate = urlDate ?? shared.pjlDate
	let articleInfoPromise: Promise<ArticleInfo | undefined> =
		Promise.resolve(undefined)
	let citingArticleInfoPromise: Promise<ArticleInfo | undefined> =
		Promise.resolve(undefined)

	try {
		if (lawArticle !== undefined && lawArticle !== null) {
			articleInfoPromise = getArticle(lawArticle, requestedDate)
		}
		if (citingLawArticle !== undefined && citingLawArticle !== null) {
			citingArticleInfoPromise = getArticle(citingLawArticle, requestedDate)
		}
	} catch (error) {
		console.error("Erreur dans la récupération des articles de loi : ", error)
		return {
			articleInfoPromise: Promise.resolve(undefined),
			citingArticleInfoPromise: Promise.resolve(undefined),
		}
	}

	return { articleInfoPromise, citingArticleInfoPromise }
}
