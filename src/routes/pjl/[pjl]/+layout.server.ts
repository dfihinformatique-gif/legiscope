import fs from "fs/promises"
import { parseHTML } from "linkedom"
import path, { join } from "path"

import {
	encodeParametersToVariables,
	findVariablesByParameter,
	getSimplifiedCoordOfValuesToHighlight,
	parameterReferences,
} from "$lib/openfisca_parameters"
import { getDbPool } from "$lib/server/db-connect"
import { shared } from "$lib/shared.svelte"
import type { ScaleParameter, ValueParameter } from "@openfisca/json-model"
import { latinMultiplicativeAdverbRegExp } from "@tricoteuses/legifrance"
import {
	newReverseTransformationsMergedFromPositionsIterator,
	simplifyHtml,
	type FragmentReverseTransformation,
} from "@tricoteuses/tisseuse"
import { readFileSync } from "fs"
import type { LayoutServerLoad } from "./$types"

const PJL_DATES = new Map<string, string>([
	["PRJLANR5L17B1906", "2025-10-14"],
	["PRJLANR5L17B1907", "2025-10-14"],
	["pjl25-024", "2025-10-14"],
	["pjl25-138", "2025-11-24"],
	["PRJLANR5L17B2247", "2025-12-15"],
	["pjl25-122", "2025-11-13"],
	["PRJLANR5L17B2141", "2025-11-26"],
	["pjl25-193", "2025-12-09"],
	["pjl25-112", "2025-11-05"],
	["PRJLANR5L17B2115", "2025-11-05"],
	["PRJLANR5L17BTC2250", "2025-12-17"],
	["DECLANR5L17B2247-N0", "2026-01-21"],
])

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

	const pjlDate = PJL_DATES.get(pjl) ?? new Date().toISOString().split("T")[0]

	shared.pjlDate = pjlDate

	const [rawHtml, currentParameterReferences] = await Promise.all([
		fs.readFile(filePath, "utf-8"),
		getCurrentLegiIds(parameterReferences, pjlDate),
	])

	try {
		const htmlWithLinks = rawHtml.replace(
			/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr\/legifrance\/(?:sections|articles|textes)\/([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
			(_match, p1, p2) => {
				const lawArticle = p1.replace(".md", "")
				const referredParameters = currentParameterReferences.get(lawArticle)
				const referredParametersLabels = []
				if (referredParameters !== undefined && user === "leximpact") {
					for (const parameter of referredParameters) {
						referredParametersLabels.push(
							parameter.short_label?.replace("'", " "),
						)
					}
					return `<a title='${referredParametersLabels.join("|")}' class='law-article-link' href='/pjl/${pjl}?article=${lawArticle}'><svg class="law-article-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M20 22H6.5A3.5 3.5 0 0 1 3 18.5V5a3 3 0 0 1 3-3h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2v-3H6.5a1.5 1.5 0 0 0 0 3zM10 4v8l3.5-2l3.5 2V4z"></path></svg><law-link-text>${p2}</law-link-text>*</a>`
				} else {
					return `<a class='law-article-link' href='/pjl/${pjl}?article=${lawArticle}'><svg class="law-article-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M20 22H6.5A3.5 3.5 0 0 1 3 18.5V5a3 3 0 0 1 3-3h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2v-3H6.5a1.5 1.5 0 0 0 0 3zM10 4v8l3.5-2l3.5 2V4z"></path></svg><law-link-text>${p2}</law-link-text></a>`
				}
			},
		)

		let HTMLWithButtons: string = ""
		const adverbPattern = latinMultiplicativeAdverbRegExp.source.replace(
			/^\^|\$$/g,
			"",
		)
		const articlePattern = new RegExp(
			String.raw`Article\s+(liminaire|\d+(?:\s*(?:${adverbPattern}))?([A-Z]+)?|\w+)`,
			"i",
		)

		if (pjl.startsWith("PRJLANR")) {
			const htmlWithLinksAndSummary = htmlWithLinks.replace(
				/<p\s+([^>]*class="[^"]*assnat9ArticleNum[^"]*"[^>]*)>/g,
				(match, attributes, offset, string) => {
					const contentMatch = string.slice(offset).match(/<p[^>]*>(.*?)<\/p>/s)

					if (!contentMatch) return match

					const content = contentMatch[1]

					// Retirer les balises HTML et les commentaires, garder le texte
					const textOnly = content
						.replace(/<!--.*?-->/gs, "") // Enlever les commentaires
						.replace(/<[^>]+>/g, "") // Enlever les balises HTML
						.replace(/&nbsp;/g, " ")
						.replace(/&#xa0;/g, " ") // Remplacer &nbsp; par espace
						.trim()

					// Chercher "Article" suivi du numéro (possiblement composé)

					const articleMatch = textOnly.match(articlePattern)

					if (!articleMatch) return match
					const articleNum = articleMatch[1].replace(/\s+/g, "") // Enlever les espaces internes

					// Vérifier si l'attribut id existe déjà
					if (attributes.includes("id=")) {
						// Remplacer l'id existant
						const newAttributes = attributes.replace(
							/id="[^"]*"/,
							`id="_TocArt${articleNum}"`,
						)
						return `<p ${newAttributes}>`
					} else {
						// Ajouter l'attribut id
						return `<p ${attributes} id="_TocArt${articleNum}">`
					}
				},
			)

			const articles: Array<{ num: string; id: string }> = []
			const seenNums = new Set<string>()
			const articleRegex =
				/<p\s+(?=(?:[^>]*class="[^"]*assnat9ArticleNum[^"]*")[^>]*id="(_TocArt[\w]+)"|(?:[^>]*id="(_TocArt[\w]+)")[^>]*class="[^"]*assnat9ArticleNum[^"]*")[^>]*>(.*?)<\/p>/gs
			let match

			while ((match = articleRegex.exec(htmlWithLinksAndSummary)) !== null) {
				const content = match[3]

				const textOnly = content
					.replace(/<!--.*?-->/gs, "") // Enlever les commentaires
					.replace(/<[^>]+>/g, "") // Enlever les balises HTML
					.replace(/&nbsp;/g, " ") // Remplacer &nbsp; par espace
					.replace(/&#xa0;/g, " ") // Remplacer &#xa0; (espace insécable) par espace
					.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec)) // Décoder les entités numériques décimales
					.replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
						String.fromCharCode(parseInt(hex, 16)),
					) // Décoder les entités hexadécimales
					.trim()

				const articleMatch = textOnly.match(articlePattern)

				if (!articleMatch) continue

				const num = articleMatch[1].replace(/\s+/g, "")

				if (seenNums.has(num)) continue

				seenNums.add(num)
				articles.push({
					id: match[1] || match[2],
					num: num,
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

			HTMLWithButtons = highlightParameterValuesInHTML(
				htmlWithLinksAndSummaryFinal,
				currentParameterReferences!,
				pjlDate,
			)
		} else if (pjl.startsWith("pjl")) {
			const htmlWithLinksAndSummary = htmlWithLinks.replace(
				/<p\s+([^>]*class="[^"]*TCNumArticle[^"]*"[^>]*)>/g,
				(match, attributes, offset, string) => {
					// Extraire tout le contenu jusqu'à la balise de fermeture </p>
					const contentMatch = string.slice(offset).match(/<p[^>]*>(.*?)<\/p>/s)

					if (!contentMatch) return match

					const content = contentMatch[1]

					// Retirer les balises HTML et les commentaires, garder le texte
					const textOnly = content
						.replace(/<!--.*?-->/gs, "") // Enlever les commentaires
						.replace(/<[^>]+>/g, "") // Enlever les balises HTML
						.replace(/&nbsp;/g, " ")
						.replace(/&#xa0;/g, " ") // Remplacer &nbsp; par espace
						.trim()

					// Chercher "Article" suivi du numéro (possiblement composé)
					const articleMatch = textOnly.match(articlePattern)

					if (!articleMatch) return match
					const articleNum = articleMatch[1].replace(/\s+/g, "") // Enlever les espaces internes

					// Vérifier si l'attribut id existe déjà
					if (attributes.includes("id=")) {
						// Remplacer l'id existant
						const newAttributes = attributes.replace(
							/id="[^"]*"/,
							`id="_TocArt${articleNum}"`,
						)
						return `<p ${newAttributes}>`
					} else {
						// Ajouter l'attribut id
						return `<p ${attributes} id="_TocArt${articleNum}">`
					}
				},
			)
			const articles: Array<{ num: string; id: string }> = []
			const seenNums = new Set<string>()
			const articleRegex =
				/<p\s+(?=(?:[^>]*class="[^"]*TCNumArticle[^"]*")[^>]*id="(_TocArt[\w]+)"|(?:[^>]*id="(_TocArt[\w]+)")[^>]*class="[^"]*TCNumArticle[^"]*")[^>]*>(.*?)<\/p>/gs
			let match

			while ((match = articleRegex.exec(htmlWithLinksAndSummary)) !== null) {
				const content = match[3]

				const textOnly = content
					.replace(/<!--.*?-->/gs, "") // Enlever les commentaires
					.replace(/<[^>]+>/g, "") // Enlever les balises HTML
					.replace(/&nbsp;/g, " ") // Remplacer &nbsp; par espace
					.replace(/&#xa0;/g, " ") // Remplacer &#xa0; (espace insécable) par espace
					.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec)) // Décoder les entités numériques décimales
					.replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
						String.fromCharCode(parseInt(hex, 16)),
					) // Décoder les entités hexadécimales
					.trim()

				const articleMatch = textOnly.match(articlePattern)

				if (!articleMatch) continue

				const num = articleMatch[1].replace(/\s+/g, "")

				if (seenNums.has(num)) continue

				seenNums.add(num)
				articles.push({
					id: match[1] || match[2],
					num: num,
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
				/(<div id="formCorrection:panel:1:table">)/,
				`${sommaire}$1`,
			)

			HTMLWithButtons = highlightParameterValuesInHTML(
				htmlWithLinksAndSummaryFinal,
				currentParameterReferences!,
				pjlDate,
			)
		} else {
			HTMLWithButtons = highlightParameterValuesInHTML(
				htmlWithLinks,
				currentParameterReferences!,
				pjlDate,
			)
		}

		const { document } = parseHTML(HTMLWithButtons)
		processDocument(document)
		const HTMLToReturn = document.toString()
		const style = readFileSync(join("static/style-shadow-pjl.css"), "utf-8")

		return {
			pjlHTML: `<style>${style}</style>
				<div class="pjl-content-wrapper">${HTMLToReturn}</div>`,
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

function processStyleTags(document: Document, baseSize: number) {
	const styleTags = document.querySelectorAll("style")

	styleTags.forEach((tag) => {
		let cssText = tag.textContent || ""

		// Mise à l'échelle des polices dans le CSS interne
		// On utilise la même logique de variable CSS que pour l'inline
		cssText = cssText.replace(FONT_SIZE_REGEX, (_, value, unit) => {
			const num = parseFloat(value)
			let ratio = 1
			if (unit.toLowerCase() === "pt" || unit.toLowerCase() === "px") {
				ratio = num / baseSize
			} else if (unit === "%") {
				ratio = num / 100
			} else {
				ratio = num
			}
			return `font-size: calc(${ratio.toFixed(3)} * var(--base-font-size))`
		})

		tag.textContent = cssText
	})
}

function isLikelyFooter(text: string | null | undefined) {
	if (!text) return false
	const cleaned = text.toLowerCase().replace(/\s+/g, " ").trim()

	/* Contient "projet de loi de finances" */
	if (!cleaned.includes("projet de loi de finances")) return false

	/* Contient un numéro isolé ou en fin */
	const hasPageNumber = /\b\d{1,3}\b/.test(cleaned)
	if (!hasPageNumber) return false

	/* Doit être court (ex : max 15 mots) */
	const wordCount = cleaned.split(/\s+/).length
	if (wordCount > 15) return false

	return true
}

function processDocument(document: Document) {
	const baseSize = getBaseFontSize(document)
	processStyleTags(document, baseSize)

	document.querySelectorAll("*").forEach((el) => {
		const element = el as HTMLElement

		// Restaure les pastilles Sénat
		if (element.classList.contains("pastille")) {
			const span = element.querySelector("span")
			if (span) {
				const ariaLabel = span.getAttribute("aria-label")
				if (ariaLabel && ariaLabel.toLowerCase().startsWith("pastille")) {
					const numMatch = ariaLabel.match(/\d+/)
					if (numMatch) {
						span.textContent = numMatch[0]
					}
				}
			}
		}

		const isInsidetable = element.closest("table")

		if (element.tagName === "TABLE") {
			const exposeMotif = element.querySelectorAll("p.assnatFPFexpogentexte")
			// Transformer les tables des exposés des motifs en div
			if (exposeMotif.length > 0) {
				const div = document.createElement("div")
				div.className = "expose-motif"

				exposeMotif.forEach((p) => {
					// On clone pour garder la structure originale du paragraphe
					div.appendChild(p.cloneNode(true))
				})

				element.replaceWith(div)
				return // On arrête le traitement pour la table supprimée
			} else {
				// Contrôle le style des autres table
				const cellCount = element.querySelectorAll("td, th").length

				if (cellCount > 2) {
					/* Créer le conteneur scrollable */
					const wrapper = document.createElement("div")
					wrapper.classList.add("table-container")

					/* Insérer le conteneur autour de la table */
					element.parentNode?.insertBefore(wrapper, element)
					wrapper.appendChild(element)
				}
			}
		}

		// Ajustement du style des images
		if (element.tagName === "IMG") {
			element.removeAttribute("width")
			element.removeAttribute("height")
			// On définit le style de base. Note : si l'image a déjà un style,
			// il sera traité/écrasé par la suite de la fonction.
			element.setAttribute(
				"style",
				"display:block; margin:0 auto; height:auto; max-width:100%;",
			)
		} else {
			if (
				["DIV", "P", "TABLE", "SECTION", "FOOTER"].includes(element.tagName)
			) {
				if (!isInsidetable || element.tagName !== "TABLE") {
					if (isLikelyFooter(el.textContent)) {
						el.remove()
						return
					}
				}
			}

			// Ajustement des font-size inline
			const styleAttr = element.getAttribute("style") || ""

			if (styleAttr) {
				let newStyle = styleAttr

				// Polices
				if (newStyle.toLowerCase().includes("font-size")) {
					newStyle = convertToRelativeEm(newStyle, baseSize)
				}

				element.setAttribute("style", newStyle)
			}
		}
	})
}

async function getCurrentLegiIds(
	originalMap: Map<string, Array<ValueParameter | ScaleParameter>>,
	date: string,
): Promise<Map<string, Array<ValueParameter | ScaleParameter>>> {
	if (originalMap.size === 0) {
		return new Map()
	}

	try {
		const updatedMap = new Map<string, Array<ValueParameter | ScaleParameter>>()
		const sql = await getDbPool()

		const dbConnection = await sql.reserve()

		try {
			const keys = Array.from(originalMap.keys())
			const result = await dbConnection`select legi_id, legi_id_lien
				from versions
				where ${date}::date between debut and fin and legi_id=ANY(${keys})`

			const dictionary = new Map(
				result.map((row) => [row.legi_id, row.legi_id_lien]),
			)

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
		} finally {
			dbConnection.release()
		}
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

	while ((match = linkRegex.exec(htmlContent)) !== null) {
		// Extraire la valeur du paramètre lawArticle du lien courant
		const lawArticleMatch = match[0].match(
			/((LEGITEXT|LEGIARTI|JORFTEXT|JORFARTI)[^']*)/,
		)
		const currentLawArticle = lawArticleMatch ? lawArticleMatch[1] : null

		// Ajouter le texte avant le lien
		const textBefore = htmlContent.substring(lastIndex, match.index)

		if (linkCount > 0 && previousLawArticle !== null) {
			const params = parameterReferences.get(previousLawArticle)
			if (!params || params.length === 0) {
				parts.push(textBefore)
			} else {
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

				for (const param of params) {
					const simplifiedCoordToHighlight =
						getSimplifiedCoordOfValuesToHighlight(textPlain, param, pjlDate)
					if (simplifiedCoordToHighlight.length > 0) {
						for (const coord of simplifiedCoordToHighlight) {
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
						}
					}
				}

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
					processedHtml = injectHighlightsIntoHtml(
						textBefore,
						coordsToHighlight,
					)
				}
				parts.push(processedHtml)
			}
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
