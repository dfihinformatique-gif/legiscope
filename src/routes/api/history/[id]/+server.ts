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
				select v.*, al.cidtexte, jt.titre_full titre_texte , al.legi_id_lien legi_id_lien_al, al.typelien, v_lien.legi_id_lien article_jorf, v_lien.num
				from articles_liens al
				join v on (v.legi_id_lien = al.legi_id)
				left join versions v_lien on (v_lien.legi_id = al.legi_id_lien and v_lien.legi_id_lien like 'JORFARTI%')
				left join jorftext jt on (jt.legi_id = al.cidtexte)
				where (al.typelien, al.cible) in
				(('CREATION', false), ('CREE', true), ('MODIFICATION', false), ('MODIFIE', true), ('ABROGATION', false), ('ABROGE', true))
				)
			select distinct cm.cidtexte, cm.titre_texte, cm.article_jorf, num,
				case when typelien = 'MODIFICATION' then 'MODIFIE'
				when typelien = 'CREATION' then 'CREE'
				when typelien = 'ABROGATION' then 'ABROGE'
				else typelien
				end typelien, debut
			from creat_modif cm
			order by debut desc`
	await dbConnection.release()

	if (historyData.length === 0) {
		return json(undefined)
	} else {
		return json(historyData)
	}
}
