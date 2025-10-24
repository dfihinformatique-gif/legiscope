import { json } from "@sveltejs/kit"
import type { RequestHandler } from "../$types"

export const GET: RequestHandler = async ({ params, locals }) => {
	const { id, date } = params as { id: string; date: string }
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
	with articles_liens_at_date as
		(
		select al.* from articles_liens al
		join legiarti on
			(
			legiarti.id = cast(substring(al.legi_id from 9) as integer)
			and
				(
				to_date(${date}, 'YYYY-MM-DD') between legiarti.date_debut and legiarti.date_fin
				or legiarti.etat = (select id from etats where etat = 'VIGUEUR_DIFF')
				)
			)
		where al.legi_id like 'LEGIARTI%'
		union all
		select al.* from articles_liens al
		join jorfarti on (jorfarti.id = cast(substring(al.legi_id from 9) as integer))
		where al.legi_id like 'JORFARTI%'
		)
	select al.cidtexte, al.legi_id_lien, coalesce(jorftext.titre, legitext.titre) titre, legiarti.num, legiarti.date_debut, legiarti.date_fin, e.etat, t.article_type
	from articles_liens_at_date al
	left join legiarti on (legiarti.legi_id = al.legi_id_lien)
	left join jorftext on (jorftext.legi_id = al.cidtexte)
	left join legitext on (legitext.legi_id = al.cidtexte)
	left join etats e on (legiarti.etat = e.id)
	left join articles_types t on (t.id = legiarti.article_type)
	where al.legi_id = ${id}
	and (al.typelien, al.cible) in
		(
			('CITATION', true),
			('CITE', false)
		)`

	await dbConnection.release()

	if (citationsData.length === 0) {
		return json([])
	} else {
		return json(citationsData)
	}
}
