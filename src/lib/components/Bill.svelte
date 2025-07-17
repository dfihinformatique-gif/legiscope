<script lang="ts">
	import BillSummary from "$lib/components/BillSummary.svelte"
	interface Props {
		pjlHTML: string | undefined
	}

	let container: HTMLDivElement | undefined = $state()
	let { pjlHTML }: Props = $props()
	let resizeObserver: ResizeObserver

	const adjustSizes = (shadowRoot: ShadowRoot) => {
		if (!shadowRoot) return

		// Ajuste les images au max 100% de leur conteneur
		shadowRoot.querySelectorAll("img").forEach((img) => {
			// Supprime les dimensions HTML (évite conflits avec CSS)
			img.removeAttribute("width")
			img.removeAttribute("height")

			// Style CSS pour un comportement fluide et centré
			img.style.display = "block"
			img.style.margin = "0 auto"
			img.style.height = "auto"
			img.style.maxWidth = "100%" // Ne dépasse jamais le conteneur
			// Pas de width forcée : l’image gardera sa taille naturelle si plus petite
		})
	}

	const scrollToAnchor = (hash: string, shadowRoot: ShadowRoot) => {
		if (!hash) return

		const id = hash.substring(1) // Remove #
		const element = shadowRoot.getElementById(id)
		if (element) {
			element.scrollIntoView({ behavior: "smooth" })
		}
	}

	// Pour supprimer les éléments vides (pas de texte ni d'enfants), sauf s'ils sont explicitement exclus (comme <img>, <iframe>, etc.) ou si il s'agit d'éléments à l'intérieur des tableaux

	const removeEmptyElements = (
		root: ShadowRoot | HTMLElement,
		excludedTags: string[] = [
			"img",
			"iframe",
			"video",
			"audio",
			"svg",
			"canvas",
			"input",
			"button",
			"br",
			"hr",
		],
	) => {
		const elements = root.querySelectorAll("*")

		elements.forEach((el) => {
			const tag = el.tagName.toLowerCase()

			// Ne jamais supprimer les balises exclues
			if (excludedTags.includes(tag)) return

			// Ne pas supprimer les éléments contenus dans un tableau
			if (el.closest("table")) return

			const hasChildren = el.children.length > 0
			const hasText = el.textContent?.trim().length > 0

			if (!hasChildren && !hasText) {
				el.remove()
			}
		})
	}

	// Pour supprimer la div de pied de page ou en-tête indiquant Projet de loi de finances 1
	const removeProjetDeLoiDivs = (root: ShadowRoot | HTMLElement) => {
		root.querySelectorAll('div[style*="clear:both"]').forEach((div) => {
			const p = div.querySelector("p.assnatFARTT08Bleu span")
			if (p && p.textContent?.includes("Projet de loi de finances")) {
				div.remove()
			}
		})
	}
	// Pour augmenter la taille de toutes les typos

	const scaleFontSizesWithRemConversion = (
		root: ShadowRoot | HTMLElement,
		factor = 1.4,
		basePx = 16, // 1rem = 16px
	) => {
		/* Fonction de conversion px -> rem */
		const convertPxToRem = (pxValue: number) => {
			const scaled = pxValue * factor
			const remValue = scaled / basePx
			return `${remValue.toFixed(4)}rem`
		}

		/* 1. Agit sur les Inline styles */
		const inlineElements = root.querySelectorAll<HTMLElement>(
			"[style*='font-size']",
		)
		inlineElements.forEach((el) => {
			const style = el.getAttribute("style")
			if (!style) return

			const updatedStyle = style.replace(
				/font-size\s*:\s*([0-9.]+)(px|pt|em|rem|%)\s*;?/gi,
				(_, value, unit) => {
					const num = parseFloat(value)
					if (unit.toLowerCase() === "px") {
						return `font-size: ${convertPxToRem(num)};`
					} else {
						const scaled = num * factor
						return `font-size: ${scaled}${unit};`
					}
				},
			)

			el.setAttribute("style", updatedStyle)
		})

		/* 2. Agit sur la CSS in <style> tags */
		const styleTags = root.querySelectorAll("style")
		styleTags.forEach((styleTag) => {
			const cssText = styleTag.textContent
			if (!cssText) return

			const updatedCss = cssText.replace(
				/font-size\s*:\s*([0-9.]+)(px|pt|em|rem|%)\s*;?/gi,
				(_, value, unit) => {
					const num = parseFloat(value)
					if (unit.toLowerCase() === "px") {
						return `font-size: ${convertPxToRem(num)};`
					} else {
						const scaled = num * factor
						return `font-size: ${scaled}${unit};`
					}
				},
			)

			styleTag.textContent = updatedCss
		})
	}

	// Pour éviter que le texte soit justifié (text-align:justify)
	const disableJustify = (root: ShadowRoot | HTMLElement) => {
		root.querySelectorAll("*").forEach((el) => {
			const style = getComputedStyle(el)
			if (style.textAlign === "justify") {
				;(el as HTMLElement).style.textAlign = "left" // ou "start"
			}
		})
	}

	$effect(() => {
		if (!container || !pjlHTML) return

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			// Pour nettoyer le fichier HTML du PLF :
			const cleanedHTML = pjlHTML
				.replace(/style="([^"]*)"/g, (match, styleContent) => {
					// Supprimer toutes les propriétés margin et padding dans le Html | Fonctionne en complément des classes CSS ajoutée ici qui permettent de limiter les margins de la Css du document
					const cleanedStyle = styleContent
						.split(";")
						.map((rule) => rule.trim())
						.filter(
							(rule) =>
								rule &&
								!/^margin(\-|$)/i.test(rule) &&
								!/^padding(\-|$)/i.test(rule),
						)
						.join("; ")

					return cleanedStyle ? `style="${cleanedStyle}"` : ""
				})
				// Ajouter un attribut data-original-width aux images en conservant la valeur de width existante
				.replace(
					/<img([^>]*)width="([^"]+)"([^>]*)>/g,
					(match, before, width, after) => {
						return `<img ${before} width="${width}" data-original-width="${width}" ${after}>`
					},
				)
				// Remplacer les <a> qui n'ont pas de href par des <span>
				.replace(/<a([^>]*?)>(.*?)<\/a>/g, (match, attributes, innerHTML) => {
					if (!/href\s*=\s*["'][^"']*["']/i.test(attributes)) {
						return `<span${attributes}>${innerHTML}</span>`
					}
					return match
				})

			shadow.innerHTML = `
				<style>
						/* STYLES POUR RENDRE LISIBLE LE HTML */

					 	:host {
							display: block;
							width: 96%;
							height: 100%;
							overflow-y: auto; /* scroll vertical indispensable pour la taille du document */
							overflow-x: hidden; /* pas de scroll horizontal */
						}
						:host, :host * {
							line-height: 1.5 !important;  /* Augmente aussi l'interligne */
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
							width: 100% !important;
							display: block;
							overflow-x: auto;
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
						}

						a { /*Crée un style pour mettre en avant les liens au sein du document */
							text-decoration: underline !important;
							text-decoration-style: dotted !important;
							text-decoration-color: #bbbbbb !important;
							text-underline-offset: 4px !important;
							text-decoration-thickness: 1px !important;
						}
						a:hover,
						a:focus {
							text-decoration-style: solid !important;
							text-decoration-color: black !important;
							text-underline-offset: 4px !important;
							text-decoration-thickness: 2px !important;
						}


				</style>
				<div class="content-wrapper">${cleanedHTML}</div>
      `
			// Pour transformer les tables des exposés des motifs en div
			const tables = shadow.querySelectorAll("table")

			tables.forEach((table) => {
				// Cherche un <p class="assnatFPFexpogentexte"> dans cette table
				if (table.querySelector("p.assnatFPFexpogentexte")) {
					// Crée un div pour remplacer la table
					const div = document.createElement("div")
					div.className = "expose-motif"

					// Récupère tout le texte des paragraphes dans la table
					const paragraphs = Array.from(
						table.querySelectorAll("p.assnatFPFexpogentexte"),
					)
					paragraphs.forEach((p) => {
						// Clone le paragraphe pour conserver la structure
						div.appendChild(p.cloneNode(true))
					})
					// Remplace la table par ce div
					table.replaceWith(div)
				}
			})

			removeEmptyElements(shadow)
			removeProjetDeLoiDivs(shadow)
			scaleFontSizesWithRemConversion(
				shadow,
				1.4,
				16,
			) /* 1,4 = +40% de taille typo | 16 = base en px pour 1rem */
			disableJustify(shadow)

			resizeObserver = new ResizeObserver(() => adjustSizes(shadow))
			resizeObserver.observe(container)
			requestAnimationFrame(() => adjustSizes(shadow))

			scrollToAnchor(window.location.hash, shadow)
			shadow.addEventListener("click", (e) => {
				const link = (e.target as HTMLElement).closest('a[href^="#"]')
				if (link) {
					e.preventDefault()
					const hash = link.getAttribute("href")
					if (hash) {
						window.history.pushState(null, "", hash)
						scrollToAnchor(hash, shadow)
					}
				}
			})
		} else {
			const wrapper = container.shadowRoot!.querySelector(".content-wrapper")
			if (wrapper) wrapper.innerHTML = pjlHTML
		}
		return () => resizeObserver?.disconnect()
	})
</script>

<div class="flex h-full w-full flex-col">
	<BillSummary {pjlHTML} {container} />
	<div bind:this={container} class="flex-1 overflow-auto"></div>
</div>
