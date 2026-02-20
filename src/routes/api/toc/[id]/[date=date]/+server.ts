import type {
	DateRange,
	SctaRow,
	TocData,
	TocDataRow,
} from "$lib/db_data_types"
import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

function parseDateRange(dateRangeStr: string | null): DateRange | null {
	if (!dateRangeStr) return null

	const rangeRegex = /^([[(])([^,]*),([^\])]*)([\])])$/
	const match = dateRangeStr.match(rangeRegex)

	if (!match) {
		if (dateRangeStr !== "empty")
			console.warn(`Format de daterange invalide: ${dateRangeStr}`)
		return null
	}

	const [, startBracket, startDate, endDate, endBracket] = match

	return {
		start: startDate && startDate.trim() !== "" ? new Date(startDate) : null,
		end: endDate && endDate.trim() !== "" ? new Date(endDate) : null,
		startInclusive: startBracket === "[",
		endInclusive: endBracket === "]",
	}
}

function parseTocDataRow(raw: SctaRow): TocDataRow {
	return {
		id: raw.id,
		chemin: raw.chemin,
		num: raw.num,
		date_debut: raw.date_debut ? new Date(raw.date_debut) : null,
		date_fin: raw.date_fin ? new Date(raw.date_fin) : null,
		titre: raw.titre,
		etat: raw.etat,
		url: raw.url,
		cid: raw.cid,
		niveau: raw.niveau,
		origine: raw.origine,
		type_objet: raw.type_objet,
		ordinalite: raw.ordinalite,
		tri_hierarchique: raw.tri_hierarchique,
		parents_valid_period: parseDateRange(raw.parents_valid_period),
		invalid_sections: raw.invalid_sections,
		dernier_segment: raw.dernier_segment,
	}
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const { id, date } = params as { id: string; date: string }
	const { sql } = locals

	// const requestedDate = new Date(date) //La date a déjà été validée par le param matcher de la route Sveltekit

	switch (true) {
		case id.startsWith("LEGITEXT"): {
			const dbConnection = await sql.reserve()

			const tocDataFromDb = await dbConnection`
			with valid_sections as
			(
			select scta1.*
			from scta scta1
			where subltree(chemin, 0, 1) = ${id}
			and ${date}::date <@ scta1.parents_valid_period
			),
			invalid_sections as
			(
			select scta1.*
			from scta scta1
			where subltree(chemin, 0, 1) = ${id}
			and ${date}::date between date_debut and date_fin
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

			if (tocDataFromDb.length === 0) {
				return json(undefined)
			} else {
				const tocData: TocData = tocDataFromDb.map((row: SctaRow) =>
					parseTocDataRow(row),
				)
				return json(tocData)
			}
		}
		case id.startsWith("JORFTEXT"): {
			const dbConnection = await sql.reserve()

			const tocDataFromDb = await dbConnection`
			select *
			from scta
			where subltree(chemin, 0, 1) = ${id}
			order by tri_hierarchique;`
			await dbConnection.release()

			if (tocDataFromDb.length === 0) {
				return json(undefined)
			} else {
				const tocData: TocData = tocDataFromDb.map((row: SctaRow) =>
					parseTocDataRow(row),
				)
				return json(tocData)
			}
		}
		default:
			error(
				422,
				"Error : dealing with ids other than LEGITEXT or JORFTEXT are not implemented yet",
			)
	}
}
