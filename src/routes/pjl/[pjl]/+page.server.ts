import fs from "fs/promises"
import path from "path"

import { parameterReferences } from "$lib/openfisca_parameters"
import { getDbPool } from "$lib/server/db-connect"
import type { ScaleParameter, ValueParameter } from "@openfisca/json-model"
import type { PageServerLoad } from "./$types"

async function getCurrentLegiIds(
	originalMap: Map<string, Array<ValueParameter | ScaleParameter>>,
	date: string,
): Promise<Map<string, Array<ValueParameter | ScaleParameter>>> {
	try {
		const updatedMap = new Map<string, Array<ValueParameter | ScaleParameter>>()
		const sql = await getDbPool()

		const dbConnection = await sql.reserve()

		const result = await dbConnection`select legi_id, legi_id_lien
				from versions
				where ${date}::date between debut and fin and legi_id=ANY(${Array.from(originalMap.keys())})`

		const dictionary = new Map(
			result.map((row) => [row.legi_id, row.legi_id_lien]),
		)
		console.log(`Trouvé ${dictionary.size} correspondances en base de données.`)
		dbConnection.release()

		for (const [key, value] of originalMap.entries()) {
			// Cherche la nouvelle clé dans le dictionnaire. Si non trouvée, garde l'ancienne.
			const newKey = dictionary.get(key) || key

			if (updatedMap.has(newKey)) {
				updatedMap.set(newKey, [...updatedMap.get(newKey)!, ...value])
			} else {
				updatedMap.set(newKey, value)
			}
		}

		return updatedMap
	} catch (error) {
		console.error("Erreur lors de la récupération des correspondances :", error)
		return new Map()
	}
}

export const load: PageServerLoad = async ({
	params,
	url,
}): Promise<{
	pjlHTML: string | undefined
	pjlDate: string | undefined
	currentParameterReferences:
		| Map<string, Array<ValueParameter | ScaleParameter>>
		| undefined
}> => {
	const pjl = params.pjl

	const filePath = path.resolve(`static/${pjl}.html`)

	try {
		const html = await fs.readFile(filePath, "utf-8")

		const htmlWithLinks = html.replace(
			/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/git\.tricoteuses\.fr[^"]*\/([^/]+\.md)"[^>]*>(.*?)<\/a>/g,
			(_match, p1, p2) => {
				const lawArticle = p1.replace(".md", "")
				return `<a href='${url.origin}/pjl/${pjl}?lawArticle=${lawArticle}'>${p2}</a>`
			},
		)
		const pjlDate = new Date("2024-10-10").toISOString().split("T")[0]
		const currentParameterReferences = await getCurrentLegiIds(
			parameterReferences,
			pjlDate,
		)
		return {
			pjlHTML: htmlWithLinks,
			pjlDate,
			currentParameterReferences,
		}
	} catch (error) {
		console.error("Error trying to read bill HTML file:", error)
		return {
			pjlHTML: undefined,
			pjlDate: undefined,
			currentParameterReferences: undefined,
		}
	}
}
