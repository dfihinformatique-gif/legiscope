import fs from "fs/promises"
import path from "path"

import {
	encodeParametersToVariables,
	findVariablesByParameter,
	getSimplifiedCoordOfValuesToHighlight,
	parameterReferences,
} from "$lib/openfisca_parameters"
import { getDbPool } from "$lib/server/db-connect"
import { shared } from "$lib/shared.svelte"
import type { ScaleParameter, ValueParameter } from "@openfisca/json-model"
import {
	originalMergedPositionsFromTransformed,
	simplifyHtml,
} from "@tricoteuses/tisseuse"
import type { LayoutServerLoad } from "./$types"

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

function injectHighlightsIntoHtml(
	html: string,
	coordsToHighlight: Map<
		{
			simplifiedStart: number
			simplifiedStop: number
			originalStart: number
			originalStop: number
			innerPrefix?: string
			innerSuffix?: string
			outerPrefix?: string
			outerSuffix?: string
		},
		{ parameters: string[] }
	>,
): string {
	const highlights = Array.from(coordsToHighlight.entries()).sort(
		([a], [b]) => b.originalStart - a.originalStart,
	)

	let result = html

	for (const [coords, { parameters }] of highlights) {
		const { originalStart, originalStop } = coords
		const before = result.slice(0, originalStart)
		const target = result.slice(originalStart, originalStop)
		const after = result.slice(originalStop)
		const parametersToVariables: Record<string, string[]> = {}

		for (const parameter of parameters) {
			parametersToVariables[parameter] = findVariablesByParameter(parameter)
		}

		result = `${before}${coords.outerPrefix ?? ""}<button class="hover:bg-le-vert-500/50 highlighted cursor-pointer bg-le-gris-dispositif-light [&>*]:!bg-transparent" data-params="${encodeParametersToVariables(parametersToVariables)}">${coords.innerPrefix ?? ""}${target}${coords.innerSuffix ?? ""}</button>${coords.outerSuffix ?? ""}${after}`
	}

	return result
}

function highlightParameterValuesInHTML(
	htmlContent: string,
	parameterReferences: Map<string, Array<ValueParameter | ScaleParameter>>,
	pjlDate: string,
): string {
	const linkRegex =
		/<a\s+[^>]*href='[^']*article=(LEGITEXT|LEGIARTI|JORFTEXT|JORFARTI)[^']*'[^>]*>.*?<\/a>/gi

	const parts: string[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null
	let linkCount = 0
	let previousLawArticle: string | null = null

	// console.log({ ici: parameterReferences.get("LEGIARTI000048805464") })

	while ((match = linkRegex.exec(htmlContent)) !== null) {
		// Extraire la valeur du paramètre lawArticle du lien courant
		const lawArticleMatch = match[0].match(
			/((LEGITEXT|LEGIARTI|JORFTEXT|JORFARTI)[^']*)/,
		)
		const currentLawArticle = lawArticleMatch ? lawArticleMatch[1] : null

		// Ajouter le texte avant le lien
		const textBefore = htmlContent.substring(lastIndex, match.index)

		if (linkCount > 0 && previousLawArticle !== null) {
			// Extraire le texte brut du HTML
			const simplified = simplifyHtml({ removeAWithHref: true })(textBefore)
			const textPlain = simplified.output
			let processedHtml = textBefore

			const simplifiedCoordWithParameters: Map<
				{ start: number; stop: number },
				Array<string>
			> = new Map()

			const coordsToHighlight: Map<
				{
					simplifiedStart: number
					simplifiedStop: number
					originalStart: number
					originalStop: number
					innerPrefix?: string
					innerSuffix?: string
					outerPrefix?: string
					outerSuffix?: string
				},
				{ parameters: Array<string> }
			> = new Map()

			parameterReferences.get(previousLawArticle)?.forEach((param) => {
				const simplifiedCoordToHighlight =
					getSimplifiedCoordOfValuesToHighlight(textPlain, param, pjlDate)
				if (simplifiedCoordToHighlight.length > 0) {
					simplifiedCoordToHighlight.forEach(
						(coord: { start: number; stop: number }) => {
							// Chercher une clé existante avec les mêmes coordonnées
							let existingKey = null
							for (const [key] of simplifiedCoordWithParameters) {
								if (key.start === coord.start && key.stop === coord.stop) {
									existingKey = key
									break
								}
							}

							if (
								existingKey &&
								!simplifiedCoordWithParameters
									.get(existingKey)!
									.includes(param.name!)
							) {
								simplifiedCoordWithParameters
									.get(existingKey)!
									.push(param.name!)
							} else {
								simplifiedCoordWithParameters.set(coord, [param.name!])
							}
						},
					)
				}
			})

			const sortedSimplifiedCoord = simplifiedCoordWithParameters
				.keys()
				.toArray()
				.filter(
					(item, index, self) =>
						index ===
						self.findIndex(
							(r) => r.start === item.start && r.stop === item.stop,
						),
				)
				.sort((a, b) => a.start - b.start)
			const coordsInOriginal = originalMergedPositionsFromTransformed(
				simplified,
				sortedSimplifiedCoord,
			)
			if (sortedSimplifiedCoord.length > 0) {
				sortedSimplifiedCoord.forEach((coord, index) => {
					coordsToHighlight.set(
						{
							simplifiedStart: coord.start,
							simplifiedStop: coord.stop,
							originalStart: coordsInOriginal[index].position.start,
							originalStop: coordsInOriginal[index].position.stop,
							innerPrefix: coordsInOriginal[index].innerPrefix,
							outerPrefix: coordsInOriginal[index].outerPrefix,
							innerSuffix: coordsInOriginal[index].innerSuffix,
							outerSuffix: coordsInOriginal[index].outerSuffix,
						},
						{ parameters: simplifiedCoordWithParameters.get(coord)! },
					)
				})
			}
			if (coordsToHighlight.size > 0) {
				// Réinjecter les highlights dans le HTML original
				processedHtml = injectHighlightsIntoHtml(textBefore, coordsToHighlight)
			}
			parts.push(processedHtml)
		} else {
			parts.push(textBefore)
		}

		// Ajouter le lien lui-même
		parts.push(match[0])

		previousLawArticle = currentLawArticle
		lastIndex = match.index + match[0].length
		linkCount++
	}

	// Ajouter le reste du contenu après le dernier lien
	parts.push(htmlContent.substring(lastIndex))

	return parts.join("")
}

export const load: LayoutServerLoad = async ({
	params,
	request,
}): Promise<{
	pjlHTML: string | undefined
	pjlDate: string | undefined
	currentParameterReferences:
		| Map<string, Array<ValueParameter | ScaleParameter>>
		| undefined
}> => {
	const authHeader = request.headers.get("authorization")
	let user: string | null = null

	if (authHeader && authHeader.startsWith("Basic ")) {
		// Extraire et décoder les credentials
		const base64Credentials = authHeader.split(" ")[1]
		const credentials = Buffer.from(base64Credentials, "base64").toString(
			"utf8",
		)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [username, password] = credentials.split(":")
		user = username
	}

	const pjl = params.pjl
	const filePath = path.resolve(`static/${pjl}.html`)

	try {
		const html = await fs.readFile(filePath, "utf-8")
		const pjlDate =
			pjl === "plf-2026-Cplt_avec_liens" ||
			pjl === "pre-plfss_2026" ||
			pjl === "PRJLANR5L17B1906"
				? new Date("2025-10-14").toISOString().split("T")[0]
				: new Date("2024-10-10").toISOString().split("T")[0]
		shared.pjlDate = pjlDate

		const currentParameterReferences = await getCurrentLegiIds(
			parameterReferences,
			pjlDate,
		)

		const htmlWithLinks = html.replace(
			/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
			(_match, p1, p2) => {
				const lawArticle = p1.replace(".md", "")
				const referredParameters = currentParameterReferences.get(lawArticle)
				const referredParametersLabels = []
				if (
					referredParameters !== undefined &&
					(pjl === "plf-2026-Cplt_avec_liens" ||
						pjl === "pre-plfss_2026" ||
						(pjl === "PRJLANR5L17B1906" && user === "leximpact"))
				) {
					for (const parameter of referredParameters) {
						referredParametersLabels.push(
							parameter.short_label?.replace("'", " "),
						)
					}
					return `<a title='${referredParametersLabels.join("|")}' href='/pjl/${pjl}?article=${lawArticle}'>${p2}*</a>`
				} else {
					return `<a href='/pjl/${pjl}?article=${lawArticle}'>${p2}</a>`
				}
			},
		)

		let HTMLToReturn: string = ""

		if (pjl === "PRJLANR5L17B1907") {
			// const htmlWithLinksAndSummary = htmlWithLinks.replace(
			// 	/(<p class="assnat9ArticleNum">[\s\n\t]*)Article\s+(\w+)([\s\n\t]*<\/p>)/g,
			// 	"$1Article $2$3".replace(
			// 		/<p class="assnat9ArticleNum">/,
			// 		'<p class="assnat9ArticleNum" id="#_TocArt$2">',
			// 	),
			// )
			const htmlWithLinksAndSummary = htmlWithLinks.replace(
				/<p class="assnat9ArticleNum">/g,
				(match, offset, string) => {
					const articleMatch = string.slice(offset).match(/Article\s+(\w+)/)
					return articleMatch
						? `<p class="assnat9ArticleNum" id="_TocArt${articleMatch[1]}">`
						: match
				},
			)

			const articles: Array<{ num: string; id: string }> = []
			const articleRegex =
				/<p class="assnat9ArticleNum" id="(_TocArt\w+)">\s*Article\s+(\w+)\s*<\/p>/g
			let match

			while ((match = articleRegex.exec(htmlWithLinksAndSummary)) !== null) {
				articles.push({
					id: match[1],
					num: match[2],
				})
			}

			const sommaire = `
\t\t<div style="display: none;">
${articles
	.map(
		(article) => `\t\t\t<p class="assnatTOC6">
\t\t\t\t<a href="#${article.id}"><span class="assnatHyperlink" style="font-weight:bold; text-decoration:none; color:#000000">ARTICLE ${article.num.toUpperCase()}</span></a>
\t\t\t</p>`,
	)
	.join("\n")}
\t\t</div>
\t\t`
			const htmlWithLinksAndSummaryFinal = htmlWithLinksAndSummary.replace(
				/(<div class="assnatSection3">)/,
				`${sommaire}$1`,
			)

			HTMLToReturn = highlightParameterValuesInHTML(
				htmlWithLinksAndSummaryFinal,
				currentParameterReferences!,
				pjlDate,
			)
		} else {
			HTMLToReturn = highlightParameterValuesInHTML(
				htmlWithLinks,
				currentParameterReferences!,
				pjlDate,
			)
		}
		return {
			pjlHTML: HTMLToReturn,
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
