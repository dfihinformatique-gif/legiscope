import { error, json } from "@sveltejs/kit"
import type { LegiTextelrStructure } from "@tricoteuses/legifrance"
import type { RequestHandler } from "./$types"

interface queryDataStructData {
	struct_data: LegiTextelrStructure
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const { id } = params as { id: string }
	const { sql } = locals

	const dbConnection = await sql.reserve()

	switch (true) {
		case id.startsWith("LEGITEXT"): {
			const structDataFromDb: queryDataStructData[] = await dbConnection<JSON>`
			select jsonb_path_query(data, '$.STRUCT') AS struct_data
			from textelr
			where id = ${id}`
			await dbConnection.release()

			if (structDataFromDb.length !== 1) {
				return json(undefined)
			}
			const structData = structDataFromDb[0].struct_data.LIEN_SECTION_TA
			if (structData)
				return json(
					structData.filter(
						(lienSectionTA) => lienSectionTA["@etat"] === "VIGUEUR",
					),
				)
			else {
				return json(undefined)
			}
		}
		case id.startsWith("LEGISCTA"): {
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
