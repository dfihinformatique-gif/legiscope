import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, locals }) => {
	const { id } = params as { id: string }
	const { sql } = locals

	const dbConnection = await sql.reserve()

	const historyData = await dbConnection`
			with v as (
				select legi_id_lien, debut
				from versions
				where legi_id = ${id}
				),
			creat_modif as (
				select v.*, al.cidtexte, regexp_replace(coalesce(jt.titre_full, jt.titre), '\\(1\\)\\s*$', '') titre_texte, jt.date_publi, al.legi_id_lien legi_id_lien_al, al.typelien, v_lien.legi_id_lien article_jorf, v_lien.num
				from articles_liens al
				join v on (v.legi_id_lien = al.legi_id)
				left join versions v_lien on (v_lien.legi_id = al.legi_id_lien and v_lien.legi_id_lien like 'JORFARTI%')
				left join jorftext jt on (jt.legi_id = al.cidtexte)
					where (al.typelien, al.cible) in
					(
						('ABROGATION', false),
						('ABROGE', true),
						('ANNULATION', false),
						('ANNULE', true),
						('CODIFICATION', false),
						('CODIFIE', true),
						('CREATION', false),
						('CREE', true),
						('MODIFICATION', false),
						('MODIFIE', true),
						('PEREMPTION', false),
						('PERIME', true),
						('TRANSFERT', false),
						('TRANSFERE', true))
					)
				select distinct cm.cidtexte, cm.titre_texte, cm.article_jorf, num,
					case
					when typelien = 'ABROGATION' then 'ABROGE'
					when typelien = 'ANNULATION' then 'ANNULE'
					when typelien = 'CODIFICATION' then 'CODIFIE'
					when typelien = 'CREATION' then 'CREE'
					when typelien = 'MODIFICATION' then 'MODIFIE'
					when typelien = 'PEREMPTION' then 'PERIME'
					when typelien = 'TRANSFERT' then 'TRANSFERE'
					else typelien
					end typelien, date_publi,
					case
						when typelien in ('CREATION', 'CREE') then 1
						when typelien in ('ABROGATION', 'ABROGE', 'ANNULATION', 'ANNULE', 'PEREMPTION', 'PERIME') then 3
						else 2
					end ordinalite
			from creat_modif cm
			order by date_publi desc, ordinalite desc`
	await dbConnection.release()

	if (historyData.length === 0) {
		return json(undefined)
	} else {
		return json(historyData)
	}
}
