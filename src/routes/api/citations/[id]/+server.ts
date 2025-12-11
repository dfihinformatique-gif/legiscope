import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, locals }) => {
	const { id } = params as { id: string }
	const { sql } = locals

	const dbConnection = await sql.reserve()

	// const citationsData = await dbConnection`
	// with articles_liens_at_date as
	// 	(
	// 	select al.* from articles_liens al
	// 	join legiarti on (legiarti.id = cast(substring(al.legi_id from 9) as integer) and to_date(${date}, 'YYYY-MM-DD') between legiarti.date_debut and legiarti.date_fin)
	// 	where al.legi_id like 'LEGIARTI%'
	// 	union all
	// 	select al.* from articles_liens al
	// 	join jorfarti on (jorfarti.id = cast(substring(al.legi_id from 9) as integer))
	// 	where al.legi_id like 'JORFARTI%'
	// 	)
	// select al.cible, al.typelien, al.cidtexte, al.legi_id_lien, jorftext.titre, legiarti.num, legiarti.date_debut, legiarti.date_fin, legiarti.etat, legiarti.article_type
	// from articles_liens_at_date al
	// left join legiarti on (legiarti.legi_id = al.legi_id_lien)
	// left join jorftext on (jorftext.legi_id = al.cidtexte)
	// where al.legi_id = ${id}
	// and (al.typelien, al.cible) in
	// 	(
	// 		('CITATION', true),
	// 		('CITE', false)
	// 	)`

	const citationsData = await dbConnection`
	with requested_article_versions as (
	select legi_id_lien from versions where legi_id = ${id}
	),
	citations1 as (
	select * from articles_liens al
	where
		(
		al.legi_id in (select legi_id_lien from requested_article_versions)
		and (al.typelien, al.cible) in
			(
				('CITATION', true),
				('CITE', false)
			)
		)
	),
	citations2 as (
	select * from articles_liens al
	where
		(
		al.legi_id_lien in (select legi_id_lien from requested_article_versions)
		and (al.typelien, al.cible) in
			(
				('CITATION', false),
				('CITE', true)
			)
		)
	)
	select distinct * from
	(
	select c2.legi_id_lien legi_id_cite, legiarti_cite.date_debut date_debut_cite, legiarti_cite.date_fin date_fin_cite, legiarti_cite.num num_cite,
	at1.article_type article_type_cite, e_cite.etat etat_cite,
	c2.legi_id legi_id_citant,
	coalesce(legiarti_citant.date_debut, legitext_citant.date_debut) date_debut_citant,
	coalesce(legiarti_citant.date_fin, legitext_citant.date_fin) date_fin_citant,
	coalesce(legiarti_citant.num, legitext_citant.num) num_citant,
	at_citant.article_type article_type_citant, coalesce(e_citant.etat, e_texte_citant.etat) etat_citant,
	case when c2.legi_id like 'LEGITEXT%' then c2.legi_id else subltree(scta_citant.chemin, 0, 1)::varchar end legitext_id_citant,
	legitext_citant.titre titre_text_citant, textes_natures.nature article_citant_texte_nature, textes_natures.id article_citant_texte_nature_id
	from citations2 c2
	left join legiarti legiarti_cite on (legiarti_cite.legi_id = c2.legi_id_lien)
	left join articles_types at1 on (at1.id = legiarti_cite.article_type)
	left join etats e_cite on (legiarti_cite.etat = e_cite.id)
	left join legiarti legiarti_citant on (c2.legi_id = legiarti_citant.legi_id)
	left join articles_types at_citant on (at_citant.id = legiarti_citant.article_type)
	left join etats e_citant on (legiarti_citant.etat = e_citant.id)
	left join scta scta_citant on (scta_citant.dernier_segment = legiarti_citant.legi_id)
	left join legitext legitext_citant on (legitext_citant.legi_id = case when c2.legi_id like 'LEGITEXT%' then c2.legi_id else subltree(scta_citant.chemin, 0, 1)::varchar end)
	left join etats e_texte_citant on (legitext_citant.etat = e_texte_citant.id)
	left join textes_natures on (textes_natures.id = legitext_citant.nature)
	union
	select distinct c1.legi_id legi_id_cite, legiarti_cite.date_debut date_debut_cite, legiarti_cite.date_fin date_fin_cite, legiarti_cite.num num_cite,
	at1.article_type article_type_cite, e_cite.etat etat_cite,
	c1.legi_id_lien legi_id_citant,
	coalesce(legiarti_citant.date_debut, legitext_citant.date_debut) date_debut_citant,
	coalesce(legiarti_citant.date_fin, legitext_citant.date_fin) date_fin_citant,
	coalesce(legiarti_citant.num, legitext_citant.num) num_citant,
	at_citant.article_type article_type_citant, coalesce(e_citant.etat, e_texte_citant.etat) etat_citant,
	case when c1.legi_id_lien like 'LEGITEXT%' then c1.legi_id_lien else subltree(scta_citant.chemin, 0, 1)::varchar end legitext_id_citant,
	legitext_citant.titre titre_text_citant, textes_natures.nature article_citant_texte_nature, textes_natures.id article_citant_texte_nature_id
	from citations1 c1
	left join legiarti legiarti_cite on (legiarti_cite.legi_id = c1.legi_id)
	left join articles_types at1 on (at1.id = legiarti_cite.article_type)
	left join etats e_cite on (legiarti_cite.etat = e_cite.id)
	left join legiarti legiarti_citant on (c1.legi_id_lien = legiarti_citant.legi_id)
	left join articles_types at_citant on (at_citant.id = legiarti_citant.article_type)
	left join etats e_citant on (legiarti_citant.etat = e_citant.id)
	left join scta scta_citant on (scta_citant.dernier_segment = legiarti_citant.legi_id)
	left join legitext legitext_citant on (legitext_citant.legi_id = case when c1.legi_id_lien like 'LEGITEXT%' then c1.legi_id_lien else subltree(scta_citant.chemin, 0, 1)::varchar end)
	left join etats e_texte_citant on (legitext_citant.etat = e_texte_citant.id)
	left join textes_natures on (textes_natures.id = legitext_citant.nature)
	)
	order by date_debut_cite desc, date_debut_citant desc`

	await dbConnection.release()

	if (citationsData.length === 0) {
		return json([])
	} else {
		return json(citationsData)
	}
}
