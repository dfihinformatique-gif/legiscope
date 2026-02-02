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

	const style = `
						/* STYLES POUR RENDRE LISIBLE LE HTML */

					 	:host {
							display: block;
							font-size: 1.125rem;
							width: 96%;
							height: 100%;
							overflow-y: auto; /* scroll vertical indispensable pour la taille du document */
							overflow-x: hidden; /* pas de scroll horizontal */
						}
						:host, :host * {
							line-height: 1.5 !important;  /* Augmente aussi l'interligne */
							outline-color: #ced3e0;
						}
						.has-custom-color {
							color: #2f406a !important;
						}
						body {
							width: 100%; /* prendre toute la largeur */
							box-sizing: border-box;
						}
						img {
							max-width: 100%; /* images adaptatives */
							height: auto !important;
							display: block !important;
							margin: 0 auto !important;
						}
						table {
							table-layout: auto;
							width: 100% !important;
							border: 1px solid black !important;
						}
						div:not([id^="formCorrection:panel"]) > div.table-container > table {
							font-size: 1rem;
						}
						.table-container { /*Style qui intervient sur la div créée pour entourer le tableau et qui permet de scroller à l'horizontale */
							overflow-x: auto;
							width: 100%;
							margin-top: 2rem !important;
							margin-bottom: 2rem !important;
						}

						.table-container table {
							width: max-content;
							table-layout: auto;
						}

						td, th {
							border-color: #ced3e0 !important;
							border-top-color: #ced3e0 !important;
							border-right-color: #ced3e0 !important;
							border-bottom-color: #ced3e0 !important;
							border-left-color: #ced3e0 !important;
							width: auto !important;
							word-wrap: break-word !important;
							overflow-wrap: break-word !important;
							padding: 0.5rem !important;
						}

						pre, code {
							white-space: pre-wrap !important;
							word-break: break-word !important;
						}
						.content-wrapper {
							position: relative;
							min-height: 100%;
							overflow-x: hidden !important;
						}
						div[class^="assnatSection"] { /*Retire les marges des sections en ciblant le début de la class */
							margin: 2rem !important;
						}

						html, p, div, ol, ul { /* Remplace toutes les marges top et bottom par 1rem pour éviter les grands écarts dans le html */
							margin-top: 0.5rem !important;
							margin-bottom: 0.5rem !important;
						}

						span { /* Ajoute un padding pour éviter que les textes ne soient collés */
							padding-right: 0.1rem !important;
							padding-left: 0.1rem !important;
						}

						.expose-motif {
							border-left: 2px solid #ccc;
							padding-left: 1rem;
						}

						/* STYLES POUR AMÉLIORER LE DESIGN DU HTML */


						p[class^="assnatFPFexpogentitre"] { /*Ajoute une marge au dessus du titre exposé des motifs */
							margin-top: 3rem !important;
						}

						[class^="assnatFPFprojetloiartexte"] { /*Cible les textes des articles TODO a mettre en lora */
							margin-top: 1rem !important;
							font-family: "Lora", serif !important;
						}

						a[href^="#"] { /*Crée un style pour mettre en avant les liens au sein du document */
							text-decoration: underline !important;
							text-decoration-style: dotted !important;
							text-decoration-color: #bbbbbb !important;
							text-underline-offset: 4px !important;
							text-decoration-thickness: 1px !important;
						}
						a[href^="#"]:hover,
						a[href^="#"]:focus {
							text-decoration-style: solid !important;
							text-decoration-color: black !important;
							text-underline-offset: 4px !important;
							text-decoration-thickness: 2px !important;
						}
						.law-article-icon {
							margin-right: 0.1em !important;
							margin-left: 0.15em !important;
							position: relative; top: 0.15em;
						}
						.law-article-icon path {
							fill: #5e709e !important;
						}
						.law-article-link:hover .law-article-icon path {
							fill: #2f406a !important;
							text-decoration: none !important;
						}
						law-link-text {
							display: inline; /* Crucial pour le retour à la ligne */
							border-bottom: 0.2rem solid #ccd3e7 !important;
						}
						.law-article-link {
							color: #000000;
							text-decoration: none !important;
						}
						.law-article-link:hover law-link-text {
							border-bottom: 0.15rem solid #2f406a !important;
						}
						.law-article-link:hover {
							color: #2f406a;
						}

						/* STYLES des numéros d'alinéas dans les articles du projet de loi */

						li.assnatFPFprojetloiartexte::before {
							margin-right: 0.9em;
							padding:0.1em;
							counter-increment: li;
							content: counter(li);
							background-color: #f5f5f5;
							color: #737373;
							border-radius: 40%;
							font-size: 0.7em;
							font-family: sans-serif;
					}

					/* Agrandir et colorer les numéros d'alinéas */
					p.assnat9ArticleNum {
						font-size: 2rem !important;
						color: #2f406a !important;
						margin-top: 2rem !important;
						padding-left: 1rem !important;
						text-align: left !important;
						border-bottom: 1px solid #2f406a !important;
						border-left: 1px solid #2f406a !important;
						padding-bottom: 0.25rem !important; /* petit espace avant la bordure */
					}

					/* Titre Niveau 2 */

					.assnat2PartieNum,
					.assnat2PartieIntit,
					p.assnat2PartieNum,
					p.assnat2PartieIntit,
					p.assnat2PartieNum span,
					p.assnat2PartieIntit span {
						margin-top: 1rem !important;
						font-size: 2rem !important; /* taille spécifique au niveau 2 */
						color: #2f406a !important;
						line-height: 1.4 !important;
					}


					/* Titre Niveau 4 */

					.assnat4TitreNum,
					.assnat4TitreIntit,
					p.assnat4TitreNum,
					p.assnat4TitreIntit,
					p.assnat4TitreNum span,
					p.assnat4TitreIntit span {
						margin-top: 0.8rem !important; /* par exemple un peu moins que niveau 2 */
						font-size: 1.5rem !important; /* taille spécifique au niveau 4 */
						color: #2f406a !important;
						line-height: 1.3 !important;
					}
				`

	try {
		const htmlWithLinks = rawHtml.replace(
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
					return `<a title='${referredParametersLabels.join("|")}' class='law-article-link' href='/pjl/${pjl}?article=${lawArticle}'><svg class="law-article-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M20 22H6.5A3.5 3.5 0 0 1 3 18.5V5a3 3 0 0 1 3-3h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2v-3H6.5a1.5 1.5 0 0 0 0 3zM10 4v8l3.5-2l3.5 2V4z"></path></svg><law-link-text>${p2}</law-link-text>*</a>`
				} else {
					return `<a class='law-article-link' href='/pjl/${pjl}?article=${lawArticle}'><svg class="law-article-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M20 22H6.5A3.5 3.5 0 0 1 3 18.5V5a3 3 0 0 1 3-3h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2v-3H6.5a1.5 1.5 0 0 0 0 3zM10 4v8l3.5-2l3.5 2V4z"></path></svg><law-link-text>${p2}</law-link-text></a>`
				}
			},
		)

		let HTMLWithButtons: string = ""

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

		return {
			pjlHTML: `<style>${style}</style>
				<div class="content-wrapper">${HTMLToReturn}</div>`,
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

function isColorChromatic(color: string): boolean {
	const hexMatch = color.match(/^#([0-9a-f]{3}){1,2}$/i)
	if (hexMatch) {
		const hex = hexMatch[0].replace("#", "")
		if (hex.length === 3) {
			return !(hex[0] === hex[1] && hex[1] === hex[2])
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

function processStyleTags(document: Document, baseSize: number): Set<string> {
	const styleTags = document.querySelectorAll("style")
	const chromaticClasses = new Set<string>()

	styleTags.forEach((tag) => {
		let cssText = tag.textContent || ""

		// Détection des classes avec couleurs chromatiques
		// On cherche le nom de la classe et la valeur de la couleur
		const colorRegex = /\.([\w-]+)\s*\{[^}]*color\s*:\s*([^;!}]+)/gi
		let match
		while ((match = colorRegex.exec(cssText)) !== null) {
			const [, className, colorValue] = match
			if (isColorChromatic(colorValue.trim())) {
				chromaticClasses.add(className)
			}
		}

		// Supprimer certaines polices
		cssText = cssText.replaceAll(
			/font-family\s*:\s*(?:(?:'[^']*'|"[^"]*"|[^;}])+?)(?=\s*[;}])/gi,
			(match) => {
				if (/marianne|arial/i.test(match)) {
					return ""
				}
				return match
			},
		)

		// Neutralisation des alignements forcés (Justify -> Left)
		cssText = cssText.replace(/text-align\s*:\s*justify/gi, "text-align: left")

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

	return chromaticClasses
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
	const chromaticClasses = processStyleTags(document, baseSize)
	const tagsToExcludeFromRemoving: string[] = [
		"IMG",
		"IFRAME",
		"VIDEO",
		"AUDIO",
		"SVG",
		"CANVAS",
		"INPUT",
		"BUTTON",
		"HR",
		"PATH",
	]

	document.querySelectorAll("*").forEach((el) => {
		const element = el as HTMLElement
		const styleAttr = element.getAttribute("style") || ""
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
					element.style.border = "1px solid black"
					element.style.borderCollapse = "collapse"
				}
			}
		}

		// Suppression des éléments vides
		if (
			!tagsToExcludeFromRemoving.includes(element.tagName) &&
			!isInsidetable
		) {
			const hasChildren = el.children.length > 0
			const hasText = el.textContent?.trim().length > 0

			if (!hasChildren && !hasText) {
				el.remove()
				return
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
					const text = el.textContent
					if (isLikelyFooter(text)) {
						el.remove()
						return
					}
				}
			}
			let hasChromatism = false
			// A. Vérification des classes internes
			// On vérifie si l'élément possède une des classes détectées comme colorées
			for (const className of element.classList) {
				if (chromaticClasses.has(className)) {
					hasChromatism = true
					break
				}
			}

			// B. Vérification du style Inline
			const colorMatch = styleAttr.match(
				/(?:color|background-color)\s*:\s*([^;]+)/i,
			)
			if (colorMatch) {
				const colorValue = colorMatch[1].trim()
				// Le style inline a le dernier mot : s'il est chromatique, on marque,
				// s'il est gris/noir, on invalide le marquage de la classe.
				hasChromatism = isColorChromatic(colorValue)
			}

			// C. Application de la classe
			if (hasChromatism) {
				element.classList.add("has-custom-color")
			} else {
				element.classList.remove("has-custom-color")
			}

			// D. Transformations structurelles du style
			if (styleAttr) {
				let newStyle = styleAttr

				// Alignement
				if (newStyle.toLowerCase().includes("justify")) {
					newStyle = newStyle.replace(
						/text-align\s*:\s*justify/gi,
						"text-align: left",
					)
				}

				// Polices
				if (newStyle.toLowerCase().includes("font-size")) {
					newStyle = convertToRelativeEm(newStyle, baseSize)
				}

				// Nettoyage margin/padding/font-family
				const cleanedStyle = newStyle
					.split(";")
					.map((r) => r.trim())
					.filter((r) => {
						if (!r) return false
						const lowerRule = r.toLowerCase()

						// Filtre font-family (Marianne, Arial)
						if (lowerRule.startsWith("font-family")) {
							return !(
								lowerRule.includes("marianne") || lowerRule.includes("arial")
							)
						}

						// Filtre Margins/Paddings (en préservant les images)
						return (
							!lowerRule.startsWith("margin") &&
							!lowerRule.startsWith("padding")
						)
					})
					.join("; ")

				if (cleanedStyle) {
					element.setAttribute("style", cleanedStyle)
				} else {
					element.removeAttribute("style")
				}
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
