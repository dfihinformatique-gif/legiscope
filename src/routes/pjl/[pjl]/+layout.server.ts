import fs from "fs/promises"
import { parseHTML } from "linkedom"
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
	newReverseTransformationsMergedFromPositionsIterator,
	simplifyHtml,
	type FragmentReverseTransformation,
} from "@tricoteuses/tisseuse"
import type { LayoutServerLoad } from "./$types"

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

	let pjlDate = new Date().toISOString().split("T")[0]

	switch (pjl) {
		case "PRJLANR5L17B1906":
		case "PRJLANR5L17B1907":
		case "pjl25-024":
			pjlDate = new Date("2025-10-14").toISOString().split("T")[0]
			break
		case "pjl25-138":
			pjlDate = new Date("2025-11-24").toISOString().split("T")[0]
			break
		case "PRJLANR5L17B2247":
			pjlDate = new Date("2025-12-15").toISOString().split("T")[0]
			break
		case "pjl25-122":
			pjlDate = new Date("2025-11-13").toISOString().split("T")[0]
			break
		case "PRJLANR5L17B2141":
			pjlDate = new Date("2025-11-26").toISOString().split("T")[0]
			break
		case "pjl25-193":
			pjlDate = new Date("2025-12-09").toISOString().split("T")[0]
			break
		case "pjl25-112":
			pjlDate = new Date("2025-11-05").toISOString().split("T")[0]
			break
		case "PRJLANR5L17B2115":
			pjlDate = new Date("2025-11-05").toISOString().split("T")[0]
			break
		case "PRJLANR5L17BTC2250":
			pjlDate = new Date("2025-12-17").toISOString().split("T")[0]
			break
		case "DECLANR5L17B2247-N0":
			pjlDate = new Date("2026-01-21").toISOString().split("T")[0]
			break
	}

	shared.pjlDate = pjlDate

	const currentParameterReferences = await getCurrentLegiIds(
		parameterReferences,
		pjlDate,
	)

	try {
		const rawHtml = await fs.readFile(filePath, "utf-8")
		const { document } = parseHTML(rawHtml)
		const baseSize = getBaseFontSize(document)
		// const baseSize = "9"
		console.log({ baseSize })

		resizeImg(document)

		// Beware ! processInternalStyle and processInlineStyles MUST be called in this order !
		processInternalStyles(document, baseSize)
		processInlineStyles(document, baseSize)

		const htmlContent = document.toString()

		const htmlWithLinks = htmlContent.replace(
			/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr\/legifrance\/(?:sections|articles|textes)\/([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
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
					return `<a title='${referredParametersLabels.join("|")}' class='law-article-link' href='/pjl/${pjl}?article=${lawArticle}'><svg class="law-article-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M20 22H6.5A3.5 3.5 0 0 1 3 18.5V5a3 3 0 0 1 3-3h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2v-3H6.5a1.5 1.5 0 0 0 0 3zM10 4v8l3.5-2l3.5 2V4z"></path></svg>${p2}*</a>`
				} else {
					return `<a class='law-article-link' href='/pjl/${pjl}?article=${lawArticle}'><svg class="law-article-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M20 22H6.5A3.5 3.5 0 0 1 3 18.5V5a3 3 0 0 1 3-3h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2v-3H6.5a1.5 1.5 0 0 0 0 3zM10 4v8l3.5-2l3.5 2V4z"></path></svg>${p2}</a>`
				}
			},
		)

		let HTMLToReturn: string = ""

		if (pjl === "PRJLANR5L17B1907") {
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

function resizeImg(document: Document) {
	document.querySelectorAll("img").forEach((img) => {
		img.removeAttribute("width")
		img.removeAttribute("height")
		img.setAttribute(
			"style",
			"display:block; margin:0 auto; height:auto; max-width:100%;",
		)
	})
}

function getBaseFontSize(document: Document): number {
	const weights: Record<string, number> = {}

	document
		.querySelectorAll<HTMLElement>('[style*="font-size"]')
		.forEach((el) => {
			const style = el.getAttribute("style") || ""
			const match = style.match(/font-size\s*:\s*([0-9.]+)(px|pt)/i)

			if (match) {
				const sizeKey = match[1] + match[2].toLowerCase()
				const textLength = el.textContent?.trim().length || 0
				weights[sizeKey] = (weights[sizeKey] || 0) + textLength
			}
		})

	const winner = Object.entries(weights).sort((a, b) => b[1] - a[1])[0]
	if (winner) {
		const size = parseFloat(winner[0])
		return size <= 7 ? 7 : size >= 18 ? 18 : size
	}

	return 12
}

const FONT_SIZE_REGEX = /font-size\s*:\s*([0-9.]+)(px|pt|em|rem|%)\s*;?/gi

function convertToRelativeEm(styleString: string, baseSize: number): string {
	return styleString.replace(FONT_SIZE_REGEX, (_, value, unit) => {
		const num = parseFloat(value)
		let ratio = 1

		if (unit.toLowerCase() === "pt" || unit.toLowerCase() === "px") {
			ratio = num / baseSize
		} else if (unit === "%") {
			ratio = num / 100
		} else {
			ratio = num
		}

		return `font-size: calc(${ratio.toFixed(3)} * var(--base-font-size));`
	})
}

function processInlineStyles(document: Document, baseSize: number) {
	document.querySelectorAll("[style]").forEach((el) => {
		let style = el.getAttribute("style") || ""
		const colorMatch = style.match(/(?:color|background-color)\s*:\s*([^;]+)/i)

		if (colorMatch) {
			const colorValue = colorMatch[1].trim()

			if (isColorChromatic(colorValue)) {
				el.classList.add("has-custom-color")
			} else {
				el.classList.remove("has-custom-color")
			}
		}

		if (style.toLowerCase().includes("font-size")) {
			style = convertToRelativeEm(style, baseSize)
		}

		const cleanedStyle = style
			.split(";")
			.map((rule) => rule.trim())
			.filter(
				(rule) =>
					rule &&
					!rule.toLowerCase().startsWith("margin") &&
					!rule.toLowerCase().startsWith("padding"),
			)
			.join("; ")

		if (cleanedStyle) {
			el.setAttribute("style", cleanedStyle)
		} else {
			el.removeAttribute("style")
		}
	})
}

function isColorChromatic(color: string): boolean {
	const hexMatch = color.match(/^#([0-9a-f]{3}){1,2}$/i)
	if (hexMatch) {
		const hex = hexMatch[0].replace("#", "")
		if (hex.length === 3) {
			return hex[0] === hex[1] && hex[1] === hex[2]
		}
		const r = hex.substring(0, 2),
			g = hex.substring(2, 4),
			b = hex.substring(4, 6)
		return !(r === g && g === b)
	}

	const rgbMatch = color.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/i)
	if (rgbMatch) {
		const [, r, g, b] = rgbMatch
		return !(r === g && g === b)
	}

	return !["gray", "grey", "black"].includes(color.toLowerCase())
}

function processInternalStyles(document: Document, baseSize: number) {
	const styleTags = document.querySelectorAll("style")
	const chromaticClasses: string[] = []

	styleTags.forEach((tag) => {
		let cssText = tag.textContent || ""

		const ruleRegex = /\.([\w-]+)\s*\{[^}]*color\s*:\s*([^;!}]+)/gi
		let match

		while ((match = ruleRegex.exec(cssText)) !== null) {
			const className = match[1]
			const colorValue = match[2].trim()

			if (isColorChromatic(colorValue)) {
				chromaticClasses.push(className)
			}
		}

		cssText = convertToRelativeEm(cssText, baseSize)
		tag.textContent = cssText
	})

	if (chromaticClasses.length > 0) {
		const selector = chromaticClasses.map((c) => `.${c}`).join(", ")
		document.querySelectorAll(selector).forEach((el) => {
			el.classList.add("has-custom-color")
		})
	}
}

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

		result = `${before}${coords.outerPrefix ?? ""}<button class="hover:bg-le-vert-500/50 highlighted cursor-pointer bg-le-gris-dispositif-light *:bg-transparent!" data-params="${encodeParametersToVariables(parametersToVariables)}">${coords.innerPrefix ?? ""}${target}${coords.innerSuffix ?? ""}</button>${coords.outerSuffix ?? ""}${after}`
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
			const originalPositionsIterator =
				newReverseTransformationsMergedFromPositionsIterator(simplified)
			const coordsInOriginal: FragmentReverseTransformation[] = []
			for (const simplifiedCoord of sortedSimplifiedCoord) {
				const result = originalPositionsIterator.next(simplifiedCoord)
				coordsInOriginal.push(result.value!)
			}
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
