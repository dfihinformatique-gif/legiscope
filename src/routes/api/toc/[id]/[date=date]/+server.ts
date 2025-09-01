import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "../$types"

// interface queryDataStructData {
// 	struct_data: LegiTextelrStructure
// }

export const GET: RequestHandler = async ({ params, locals }) => {
	const { id, date } = params as { id: string; date: string }
	const { sql } = locals

	// const requestedDate = new Date(date) //La date a déjà été validée par le param matcher de la route Sveltekit

	switch (true) {
		case id.startsWith("LEGITEXT"): {
			const dbConnection = await sql.reserve()

			const tocData = await dbConnection`
			with valid_sections as
			(
			select scta1.*
			from scta scta1
			where subltree(chemin, 0, 1) = ${id}
			and date ${date} <@ scta1.parents_valid_period
			),
			invalid_sections as
			(
			select scta1.*
			from scta scta1
			where subltree(chemin, 0, 1) = ${id}
			and date ${date} between date_debut and date_fin
			and scta1.type_objet ='art'
			)
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
			order by tri_hierarchique;`
			await dbConnection.release()

			if (tocData.length !== 1) {
				return json(undefined)
			} else {
				return json(tocData)
			}
		}
		case id.startsWith("LEGISCTA"): {
			const dbConnection = await sql.reserve()

			const structDataFromDb: queryDataStructData[] = await dbConnection<JSON>`
			select jsonb_path_query(data, '$.STRUCTURE_TA') AS struct_data
			from section_ta
			where id = ${id}`
			await dbConnection.release()

			if (structDataFromDb.length !== 1) {
				return json(undefined)
			}
			const structData = structDataFromDb[0].struct_data.LIEN_SECTION_TA
			if (structData) {
				return json(
					structData.filter(
						(lienSectionTA) => lienSectionTA["@etat"] === "VIGUEUR",
					),
				)
			} else {
				return json(undefined)
			}
		}
		default:
			error(
				422,
				"Error : dealing with ids other than LEGITEXT or LEGISCTA are not implemented yet",
			)
	}
}
